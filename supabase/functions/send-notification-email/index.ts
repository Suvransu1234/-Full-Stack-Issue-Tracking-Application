import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { notificationId } = await req.json()

    if (!notificationId) {
      return Response.json(
        { error: 'notificationId is required' },
        { status: 400, headers: corsHeaders },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: notification, error } = await supabase
      .from('notifications')
      .select('id, user_id, task_id, message, type')
      .eq('id', notificationId)
      .single()

    if (error) throw error

    const [{ data: recipientProfile }, { data: task }] = await Promise.all([
      supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', notification.user_id)
        .single(),
      supabase
        .from('tasks')
        .select('title, share_token')
        .eq('id', notification.task_id)
        .single(),
    ])

    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      return Response.json(
        { skipped: true, reason: 'RESEND_API_KEY is not configured' },
        { headers: corsHeaders },
      )
    }

    const recipient = recipientProfile?.email
    if (!recipient) {
      return Response.json(
        { skipped: true, reason: 'Recipient email not found' },
        { headers: corsHeaders },
      )
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? ''
    const shareUrl = task?.share_token
      ? `${siteUrl}/share/${task.share_token}`
      : siteUrl

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_FROM') ?? 'TrackFlow <onboarding@resend.dev>',
        to: recipient,
        subject: `TrackFlow: ${notification.type}`,
        html: `
          <h2>${task?.title ?? 'Task update'}</h2>
          <p>${notification.message}</p>
          ${shareUrl ? `<p><a href="${shareUrl}">Open task</a></p>` : ''}
        `,
      }),
    })

    if (!emailResponse.ok) {
      const detail = await emailResponse.text()
      throw new Error(detail)
    }

    return Response.json({ sent: true }, { headers: corsHeaders })
  } catch (error) {
    return Response.json(
      { error: error.message ?? 'Unable to send email notification' },
      { status: 500, headers: corsHeaders },
    )
  }
})
