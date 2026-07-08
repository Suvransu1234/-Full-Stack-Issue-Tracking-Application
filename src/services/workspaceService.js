import { supabase } from '../lib/supabase'

const requireClient = () => {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }
  return supabase
}

export async function getMyWorkspaces(userId) {
  const client = requireClient()
  const { data, error } = await client
    .from('workspace_members')
    .select('role, workspaces(id, name, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map((row) => ({
    role: row.role,
    ...row.workspaces,
  }))
}

export async function getMyDueTasks(userId) {
  const client = requireClient()
  const { data: memberships, error: membershipsError } = await client
    .from('workspace_members')
    .select('role, workspace_id, workspaces(id, name)')
    .eq('user_id', userId)

  if (membershipsError) throw membershipsError

  const workspaceIds = (memberships || []).map((membership) => membership.workspace_id)
  if (workspaceIds.length === 0) return []

  const { data, error } = await client
    .from('tasks')
    .select('id, title, status, priority, due_date, workspace_id, assigned_to, visibility_role')
    .in('workspace_id', workspaceIds)
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true })

  if (error) throw error

  const membershipByWorkspace = new Map(
    (memberships || []).map((membership) => [membership.workspace_id, membership]),
  )

  return (data || [])
    .filter((task) => {
      const membership = membershipByWorkspace.get(task.workspace_id)
      if (!membership) return false
      if (membership.role === 'admin') return true
      if (task.assigned_to === userId) return true
      if (!task.visibility_role) return true
      return task.visibility_role === membership.role
    })
    .map((task) => ({
      ...task,
      workspace_name:
        membershipByWorkspace.get(task.workspace_id)?.workspaces?.name || 'Workspace',
    }))
}

export async function createWorkspace(name) {
  const client = requireClient()
  const { data, error } = await client.rpc('create_workspace_with_owner', {
    workspace_name: name,
  })

  if (error) throw error
  return data
}

export async function getWorkspaceBundle(workspaceId, userId) {
  const client = requireClient()

  // Load the whole workspace screen in one request group so the UI can render
  // board, list, team, labels, sections, and notifications from one bundle.
  const [
    workspaceResult,
    membershipResult,
    membersResult,
    sectionsResult,
    labelsResult,
    tasksResult,
    notificationsResult,
  ] = await Promise.all([
    client.from('workspaces').select('*').eq('id', workspaceId).single(),
    client
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single(),
    client
      .from('workspace_members')
      .select('id, role, profiles(id, email, full_name, avatar_url)')
      .eq('workspace_id', workspaceId),
    client
      .from('sections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('order_index'),
    client
      .from('labels')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name'),
    client
      .from('tasks')
      .select('*, task_labels(labels(*))')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const error =
    workspaceResult.error ||
    membershipResult.error ||
    membersResult.error ||
    sectionsResult.error ||
    labelsResult.error ||
    tasksResult.error ||
    notificationsResult.error

  if (error) throw error

  return {
    workspace: workspaceResult.data,
    role: membershipResult.data?.role || 'member',
    members: membersResult.data || [],
    sections: sectionsResult.data || [],
    labels: labelsResult.data || [],
    // Supabase returns task_labels as a join table; flatten it so components
    // can use task.labels directly.
    tasks: (tasksResult.data || []).map((task) => ({
      ...task,
      labels: (task.task_labels || []).map((item) => item.labels).filter(Boolean),
    })),
    notifications: notificationsResult.data || [],
  }
}

export async function addMemberByEmail(workspaceId, email, role) {
  const client = requireClient()
  const { data, error } = await client.rpc('add_workspace_member_by_email', {
    workspace_id_input: workspaceId,
    member_email: email,
    member_role: role,
  })

  if (error) throw error
  return data
}

export async function createTeamInvite(workspaceId, email, role, userId) {
  const client = requireClient()
  const { data, error } = await client
    .from('team_invites')
    .insert({
      workspace_id: workspaceId,
      email,
      role,
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function acceptTeamInvite(token) {
  const client = requireClient()
  const { data, error } = await client.rpc('accept_team_invite', {
    invite_token: token,
  })

  if (error) throw error
  return data
}

export async function createSection(workspaceId, name) {
  const client = requireClient()
  const { data, error } = await client
    .from('sections')
    .insert({ workspace_id: workspaceId, name })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createLabel(workspaceId, name, color) {
  const client = requireClient()
  const { data, error } = await client
    .from('labels')
    .insert({ workspace_id: workspaceId, name, color })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function saveTask(task, labelIds = []) {
  const client = requireClient()
  const shouldSyncLabels = Array.isArray(labelIds)
  const payload = {
    workspace_id: task.workspace_id,
    section_id: task.section_id || null,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date || null,
    assigned_to: task.assigned_to || null,
    visibility_role: task.visibility_role || null,
    created_by: task.created_by,
    created_by_role: task.created_by_role,
    share_token: task.share_token || crypto.randomUUID(),
  }

  const query = task.id
    ? client.from('tasks').update(payload).eq('id', task.id)
    : client.from('tasks').insert(payload)

  const { data, error } = await query.select().single()
  if (error) throw error

  if (!shouldSyncLabels) return data

  await client.from('task_labels').delete().eq('task_id', data.id)

  if (labelIds.length > 0) {
    const rows = labelIds.map((labelId) => ({
      task_id: data.id,
      label_id: labelId,
    }))
    const { error: labelsError } = await client.from('task_labels').insert(rows)
    if (labelsError) throw labelsError
  }

  if (data.assigned_to && data.assigned_to !== data.created_by) {
    await createNotification(
      data.assigned_to,
      data.id,
      'assigned',
      `You were assigned: ${data.title}`,
    )
  }

  return data
}

export async function updateTaskStatus(taskId, status) {
  const client = requireClient()
  const { data, error } = await client
    .from('tasks')
    .update({ status })
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTask(taskId) {
  const client = requireClient()
  const { error } = await client.from('tasks').delete().eq('id', taskId)
  if (error) throw error
}

export async function enableTaskSharing(taskId) {
  const client = requireClient()
  const { data, error } = await client
    .from('tasks')
    .update({
      share_enabled: true,
      share_token: crypto.randomUUID(),
    })
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getComments(taskId) {
  const client = requireClient()
  const { data, error } = await client
    .from('comments')
    .select('*, profiles(id, email, full_name, avatar_url)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function addComment(task, userId, content, mentionedUserIds = []) {
  const client = requireClient()
  const { data, error } = await client
    .from('comments')
    .insert({ task_id: task.id, user_id: userId, content })
    .select('*, profiles(id, email, full_name, avatar_url)')
    .single()

  if (error) throw error

  // Avoid duplicate notifications when the same user is both assignee,
  // creator, or mentioned in the same comment.
  const notifiedUsers = new Set()

  if (task.assigned_to && task.assigned_to !== userId) {
    notifiedUsers.add(task.assigned_to)
    await createNotification(
      task.assigned_to,
      task.id,
      'comment',
      `New comment on: ${task.title}`,
    )
  }

  if (task.created_by && task.created_by !== userId && !notifiedUsers.has(task.created_by)) {
    notifiedUsers.add(task.created_by)
    await createNotification(
      task.created_by,
      task.id,
      'comment',
      `New comment on your task: ${task.title}`,
    )
  }

  for (const mentionedUserId of mentionedUserIds) {
    if (mentionedUserId === userId || notifiedUsers.has(mentionedUserId)) continue
    notifiedUsers.add(mentionedUserId)
    await createNotification(
      mentionedUserId,
      task.id,
      'mention',
      `You were mentioned on: ${task.title}`,
    )
  }

  return data
}

export async function createNotification(userId, taskId, type, message) {
  const client = requireClient()
  // Notifications are created through an RPC because RLS should not allow
  // the browser to directly insert rows for another user's inbox.
  const { data, error } = await client
    .rpc('create_task_notification', {
      target_user_id: userId,
      task_id_input: taskId,
      notification_type: type,
      notification_message: message,
    })

  if (error) throw error

  try {
    const { error: emailError } = await client.functions.invoke('send-notification-email', {
      body: { notificationId: data },
    })
    if (emailError) {
      console.warn('Email notification was not sent.', emailError)
    }
  } catch (emailError) {
    console.warn('Email notification was not sent.', emailError)
  }

  return {
    id: data,
    user_id: userId,
    task_id: taskId,
    type,
    message,
  }
}

export async function markNotificationRead(notificationId) {
  const client = requireClient()
  const { error } = await client
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) throw error
}

export async function markAllNotificationsRead(userId) {
  const client = requireClient()
  const { error } = await client
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) throw error
}

export async function getPublicTaskByToken(token) {
  const client = requireClient()
  const { data, error } = await client
    .from('tasks')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      due_date,
      share_token,
      section_id,
      sections(name),
      task_labels(labels(id, name, color))
    `)
    .eq('share_token', token)
    .eq('share_enabled', true)
    .single()

  if (error) throw error
  return {
    ...data,
    labels: (data.task_labels || []).map((item) => item.labels).filter(Boolean),
  }
}
