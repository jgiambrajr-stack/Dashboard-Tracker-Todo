'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DashboardConfig } from '@/lib/types'

interface ProjectsModuleProps {
  config: DashboardConfig
  userId: string
}

export default function ProjectsModule({ config, userId }: ProjectsModuleProps) {
  const supabase = createClient()
  const [activeProject, setActiveProject] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loadingNote, setLoadingNote] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())

  async function openProject(projectId: string) {
    if (activeProject === projectId) { setActiveProject(null); return }
    setActiveProject(projectId)
    if (notes[projectId] === undefined) {
      setLoadingNote(projectId)
      const { data } = await supabase
        .from('project_notes').select('content')
        .eq('user_id', userId).eq('project_id', projectId)
        .order('created_at', { ascending: false }).limit(1).single()
      setNotes((prev) => ({ ...prev, [projectId]: data?.content ?? '' }))
      setLoadingNote(null)
    }
  }

  async function saveNote(projectId: string) {
    setSaving(projectId)
    await supabase.from('project_notes').insert({
      user_id: userId,
      project_id: projectId,
      content: notes[projectId] ?? '',
    })
    setSaving(null)
    setSaved((prev) => new Set([...prev, projectId]))
    setTimeout(() => setSaved((prev) => { const n = new Set(prev); n.delete(projectId); return n }), 2000)
  }

  if (config.projects.length === 0) {
    return (
      <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
        No projects yet — chat to add some
      </div>
    )
  }

  return (
    <div className="space-y-2 pb-4">
      {config.projects.map((project) => {
        const isOpen = activeProject === project.id
        const noteContent = notes[project.id] ?? ''

        return (
          <div
            key={project.id}
            className="rounded-2xl overflow-hidden transition-all"
            style={{
              border: `1px solid ${isOpen ? 'rgba(0,0,0,0.12)' : 'var(--border)'}`,
              background: isOpen ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <button
              onClick={() => openProject(project.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: project.color || '#111' }} />
              <span className="text-base leading-none">{project.icon}</span>
              <span className="text-sm flex-1 font-medium" style={{ color: 'var(--text)' }}>{project.label}</span>
              <span className="text-[10px] transition-transform duration-200" style={{ opacity: 0.25, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {loadingNote === project.id ? (
                  <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
                ) : (
                  <>
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [project.id]: e.target.value }))}
                      placeholder="Add a note, status update, or idea..."
                      rows={4}
                      className="w-full px-4 py-3 text-sm bg-transparent outline-none resize-none"
                      style={{ color: 'var(--text)', fontFamily: 'inherit' }}
                    />
                    <div className="flex justify-between items-center px-4 pb-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                      <span className="text-[10px]" style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>
                        {noteContent.length > 0 ? `${noteContent.length} chars` : ''}
                      </span>
                      <button
                        onClick={() => saveNote(project.id)}
                        disabled={saving === project.id || !noteContent.trim()}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-30 transition-all mt-2"
                        style={{
                          background: saved.has(project.id) ? 'var(--success)' : 'var(--accent)',
                          color: '#111',
                        }}
                      >
                        {saving === project.id ? 'Saving...' : saved.has(project.id) ? 'Saved ✓' : 'Save'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
