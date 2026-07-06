import { useEffect, useMemo, useState } from 'react'
import { PRIORITIES, ROLES, STATUSES } from '../lib/constants'

const emptyTask = {
  title: '',
  description: '',
  section_id: '',
  status: 'todo',
  priority: 'P3',
  due_date: '',
  assigned_to: '',
  visibility_role: '',
}

export default function TaskForm({
  task,
  workspaceId,
  role,
  userId,
  members,
  sections,
  labels,
  canEditMain,
  onCreateLabel,
  onCreateSection,
  onSubmit,
  onDelete,
}) {
  const [form, setForm] = useState(emptyTask)
  const [selectedLabels, setSelectedLabels] = useState([])
  const [newLabelName, setNewLabelName] = useState('')
  const [newSectionName, setNewSectionName] = useState('')

  const isEditing = Boolean(task?.id)

  useEffect(() => {
    setForm(task ? { ...emptyTask, ...task } : emptyTask)
    setSelectedLabels(task?.labels?.map((label) => label.id) || [])
  }, [task])

  const canChangeMainFields = useMemo(
    () => !isEditing || canEditMain,
    [canEditMain, isEditing],
  )

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const toggleLabel = (labelId) => {
    setSelectedLabels((current) =>
      current.includes(labelId)
        ? current.filter((id) => id !== labelId)
        : [...current, labelId],
    )
  }

  const submit = (event) => {
    event.preventDefault()
    onSubmit(
      {
        ...form,
        workspace_id: workspaceId,
        created_by: task?.created_by || userId,
        created_by_role: task?.created_by_role || role,
        share_token: task?.share_token,
      },
      canChangeMainFields ? selectedLabels : undefined,
    )
  }

  const submitNewLabel = async () => {
    if (!newLabelName.trim() || !onCreateLabel) return
    const label = await onCreateLabel(newLabelName.trim())
    setSelectedLabels((current) => [...current, label.id])
    setNewLabelName('')
  }

  const submitNewSection = async () => {
    if (!newSectionName.trim() || !onCreateSection) return
    const section = await onCreateSection(newSectionName.trim())
    update('section_id', section.id)
    setNewSectionName('')
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label className="field">
        <span>Title</span>
        <input
          value={form.title}
          disabled={!canChangeMainFields}
          onChange={(event) => update('title', event.target.value)}
          required
          placeholder="Fix login error"
        />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea
          value={form.description || ''}
          disabled={!canChangeMainFields}
          onChange={(event) => update('description', event.target.value)}
          rows="4"
          placeholder="Explain what needs to be done"
        />
      </label>

      <div className="form-grid">
        <label className="field">
          <span>Status</span>
          <select value={form.status} onChange={(event) => update('status', event.target.value)}>
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Priority</span>
          <select
            value={form.priority}
            disabled={!canChangeMainFields}
            onChange={(event) => update('priority', event.target.value)}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Section</span>
          <select
            value={form.section_id || ''}
            disabled={!canChangeMainFields}
            onChange={(event) => update('section_id', event.target.value)}
          >
            <option value="">No section</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </label>

        {canChangeMainFields && onCreateSection && (
          <div className="quick-create-field">
            <span>New section</span>
            <div className="quick-create-row">
              <input
                value={newSectionName}
                onChange={(event) => setNewSectionName(event.target.value)}
                placeholder="QA"
              />
              <button type="button" className="ghost-button" onClick={submitNewSection}>
                Add
              </button>
            </div>
          </div>
        )}

        <label className="field">
          <span>Assignee</span>
          <select
            value={form.assigned_to || ''}
            disabled={!canChangeMainFields}
            onChange={(event) => update('assigned_to', event.target.value)}
          >
            <option value="">Unassigned</option>
            {members
              .filter((member) => member.profiles?.id)
              .map((member) => (
                <option key={member.profiles.id} value={member.profiles.id}>
                  {member.profiles.full_name || member.profiles.email}
                </option>
              ))}
          </select>
        </label>

        <label className="field">
          <span>Due date</span>
          <input
            type="date"
            value={form.due_date || ''}
            disabled={!canChangeMainFields}
            onChange={(event) => update('due_date', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Visibility</span>
          <select
            value={form.visibility_role || ''}
            disabled={!canChangeMainFields}
            onChange={(event) => update('visibility_role', event.target.value)}
          >
            <option value="">All workspace members</option>
            {ROLES.map((item) => (
              <option key={item.value} value={item.value}>
                Only {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="label-choice-grid">
        {labels.map((label) => (
          <label key={label.id} className="check-pill">
            <input
              type="checkbox"
              checked={selectedLabels.includes(label.id)}
              disabled={!canChangeMainFields}
              onChange={() => toggleLabel(label.id)}
            />
            <span style={{ borderColor: label.color }}>{label.name}</span>
          </label>
        ))}
      </div>

      {canChangeMainFields && onCreateLabel && (
        <div className="quick-create-row">
          <input
            value={newLabelName}
            onChange={(event) => setNewLabelName(event.target.value)}
            placeholder="New label"
          />
          <button type="button" className="ghost-button" onClick={submitNewLabel}>
            Add label
          </button>
        </div>
      )}

      {!canChangeMainFields && (
        <p className="hint">
          This task was created by an Admin. Project Managers can update status
          and add comments, but cannot edit the main task content.
        </p>
      )}

      <div className="action-row">
        <button type="submit" className="primary-button">
          {isEditing ? 'Save task' : 'Create task'}
        </button>
        {isEditing && onDelete && (
          <button type="button" className="danger-button" onClick={() => onDelete(task)}>
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
