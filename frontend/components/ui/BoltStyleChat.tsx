'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Bolt,
  Brain,
  Check,
  ChevronDown,
  FileCode,
  Image,
  Lightbulb,
  Paperclip,
  Plus,
  SendHorizontal,
  Server,
  ShieldAlert,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'

interface Model {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  badge?: string
}

interface BoltStyleChatProps {
  title?: string
  highlightWord?: string
  ending?: string
  subtitle?: string
  announcementText?: string
  announcementHref?: string
  placeholder?: string
  onSend?: (message: string) => void
  onImport?: (source: string) => void
  className?: string
  showClose?: boolean
  onClose?: () => void
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  isSending?: boolean
  error?: string | null
  onInvestigate?: () => void
}

const models: Model[] = [
  {
    id: 'sonnet-4.5',
    name: 'Sonnet 4.5',
    description: 'Fast triage for active alerts',
    icon: <Zap className="size-4 text-blue-400" />,
    badge: 'Default',
  },
  {
    id: 'opus-4.5',
    name: 'Opus 4.5',
    description: 'Deep forensic analysis',
    icon: <Sparkles className="size-4 text-purple-400" />,
    badge: 'Pro',
  },
  {
    id: 'haiku-4.5',
    name: 'Haiku 4.5',
    description: 'Fast log summarization',
    icon: <Brain className="size-4 text-emerald-400" />,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Detection reasoning assistant',
    icon: <Sparkles className="size-4 text-green-400" />,
  },
  {
    id: 'gemini-2.0',
    name: 'Gemini 2.0',
    description: 'Correlation and clustering',
    icon: <Brain className="size-4 text-cyan-400" />,
  },
]

function ModelSelector({
  selectedModel = 'sonnet-4.5',
  onModelChange,
}: {
  selectedModel?: string
  onModelChange?: (model: Model) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(models.find((model) => model.id === selectedModel) || models[0])

  const handleSelect = (model: Model) => {
    setSelected(model)
    setIsOpen(false)
    onModelChange?.(model)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="theme-chat-model-button flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-[#8a8a8f] transition-all duration-200 hover:bg-white/5 hover:text-white active:scale-95"
      >
        {selected.icon}
        <span>{selected.name}</span>
        <ChevronDown className={`size-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="theme-chat-menu absolute bottom-full left-0 z-50 mb-2 min-w-[220px] overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1e]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="p-1.5">
              <div className="theme-chat-muted-text px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a5f]">
                Select Model
              </div>
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model)}
                  className={`theme-chat-menu-item flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-all duration-150 ${
                    selected.id === model.id
                      ? 'bg-white/10 text-white'
                      : 'text-[#a0a0a5] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex-shrink-0">{model.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{model.name}</span>
                      {model.badge ? (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            model.badge === 'Pro'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {model.badge}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-[#6a6a6f]">{model.description}</span>
                  </div>
                  {selected.id === model.id ? <Check className="size-4 flex-shrink-0 text-blue-400" /> : null}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function ChatInput({
  onSend,
  onInvestigate,
  placeholder = 'Ask about suspicious activity, evidence, or a log source...',
}: {
  onSend?: (message: string) => void
  onInvestigate?: () => void
  placeholder?: string
}) {
  const [message, setMessage] = useState('')
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
    }
  }, [message])

  const handleSubmit = () => {
    if (!message.trim()) return
    onSend?.(message)
    setMessage('')
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      <div className="pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent" />
      <div className="theme-chat-input-shell relative rounded-2xl bg-[#1e1e22] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_20px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.08]">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="theme-chat-textarea min-h-[78px] max-h-[160px] w-full resize-none bg-transparent px-5 pb-3 pt-5 text-[15px] text-white placeholder-[#5a5a5f] focus:outline-none"
          style={{ height: '78px' }}
        />

        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="theme-chat-icon-button flex size-8 items-center justify-center rounded-full bg-white/[0.08] text-[#8a8a8f] transition-all duration-200 hover:bg-white/[0.12] hover:text-white active:scale-95"
              >
                <Plus className={`size-4 transition-transform duration-200 ${showAttachMenu ? 'rotate-45' : ''}`} />
              </button>

              {showAttachMenu ? (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                  <div className="theme-chat-menu absolute bottom-full left-0 z-50 mb-2 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1e]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
                    <div className="min-w-[180px] p-1.5">
                      {[
                        { icon: <Paperclip className="size-4" />, label: 'Upload logs' },
                        { icon: <Image className="size-4" />, label: 'Attach evidence' },
                        { icon: <FileCode className="size-4" />, label: 'Import rules' },
                      ].map((item) => (
                        <button
                          key={item.label}
                          className="theme-chat-menu-item flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[#a0a0a5] transition-all duration-150 hover:bg-white/5 hover:text-white"
                        >
                          {item.icon}
                          <span className="text-sm">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <ModelSelector />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onInvestigate}
              className="theme-chat-pill-button flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-[#6a6a6f] transition-all duration-200 hover:bg-white/5 hover:text-white"
            >
              <Lightbulb className="size-4" />
              <span className="hidden sm:inline">Investigate</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={!message.trim()}
              className="theme-chat-send-button flex items-center gap-2 rounded-full bg-[#1488fc] px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_rgba(20,136,252,0.3)] transition-all duration-200 hover:bg-[#1a94ff] disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
            >
              <span className="hidden sm:inline">Analyze</span>
              <SendHorizontal className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnnouncementBadge({ text, href = '#' }: { text: string; href?: string }) {
  const content = (
    <>
      <span
        className="pointer-events-none absolute left-0 right-0 top-0 h-1/2 opacity-70 mix-blend-overlay"
        style={{ background: 'radial-gradient(ellipse at center top, rgba(255, 255, 255, 0.15) 0%, transparent 70%)' }}
      />
      <span
        className="absolute -top-px left-1/2 h-[2px] w-[100px] -translate-x-1/2 opacity-60"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(37, 119, 255, 0.8) 20%, rgba(126, 93, 225, 0.8) 50%, rgba(59, 130, 246, 0.8) 80%, transparent 100%)',
          filter: 'blur(0.5px)',
        }}
      />
      <Bolt className="theme-chat-announcement-icon relative z-10 size-4 text-white" />
      <span className="theme-chat-announcement-text relative z-10 font-medium text-white">{text}</span>
    </>
  )

  const className =
    'theme-chat-announcement relative inline-flex min-h-[40px] items-center gap-2 overflow-hidden rounded-full px-5 py-2 text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]'
  const style = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
    backdropFilter: 'blur(20px) saturate(140%)',
    boxShadow:
      'inset 0 1px rgba(255,255,255,0.2), inset 0 -1px rgba(0,0,0,0.1), 0 8px 32px -8px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.08)',
  }

  return href !== '#' ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
      {content}
    </a>
  ) : (
    <button className={className} style={style}>
      {content}
    </button>
  )
}

function ImportButtons({ onImport }: { onImport?: (source: string) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <span className="theme-chat-muted-text text-sm text-[#6a6a6f]">or connect a source</span>
      <div className="flex gap-2">
        {[
          { id: 'windows', name: 'Windows Logs', icon: <Server className="size-4" /> },
          { id: 'github', name: 'Detection Rules', icon: <ShieldAlert className="size-4" /> },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => onImport?.(option.id)}
            className="theme-chat-pill-button flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0f0f0f] px-3 py-1.5 text-xs font-medium text-[#8a8a8f] transition-all duration-200 hover:bg-[#1a1a1e] hover:text-white active:scale-95"
          >
            {option.icon}
            <span>{option.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function BoltStyleChat({
  title = 'What incident should we',
  highlightWord = 'investigate',
  ending = ' first?',
  subtitle = 'Ask BlackLogix to explain an alert, validate a hash, or trace suspicious activity across your logs.',
  announcementText = 'AI Security Assistant',
  announcementHref = '#',
  placeholder = 'Ask about a suspicious login, malware indicator, or immutable log hash...',
  onSend,
  onImport,
  className = '',
  showClose = false,
  onClose,
  messages = [],
  isSending = false,
  error = null,
  onInvestigate,
}: BoltStyleChatProps) {
  const hasMessages = messages.length > 0
  const messageListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = messageListRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages, isSending])

  return (
    <div
      className={`theme-chat-shell relative flex h-full w-full flex-col overflow-hidden rounded-[28px] bg-[#0f0f0f] ${className}`}
    >
      {showClose ? (
        <button
          type="button"
          onClick={onClose}
          className="theme-chat-close absolute right-4 top-4 z-20 rounded-full border border-white/10 bg-white/5 p-2 text-[#8a8a8f] transition-colors hover:text-white"
          aria-label="Close chat"
        >
          <X className="size-4" />
        </button>
      ) : null}

      <div className="relative z-10 flex h-full min-h-0 flex-col px-4 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6">
        <div className="mx-auto">
          <AnnouncementBadge text={announcementText} href={announcementHref} />
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col items-center ${hasMessages ? 'justify-start' : 'justify-center'}`}
        >
          {!hasMessages ? (
            <div className="mb-6 mt-8 text-center">
              <h1 className="theme-chat-title text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {title}{' '}
                <span className="theme-chat-highlight bg-gradient-to-b from-[#4da5fc] via-[#4da5fc] to-white bg-clip-text italic text-transparent">
                  {highlightWord}
                </span>{' '}
                {ending}
              </h1>
              <p className="theme-chat-subtitle mt-2 text-sm font-semibold text-[#8a8a8f] sm:text-base">
                {subtitle}
              </p>
            </div>
          ) : null}

          {hasMessages ? (
            <div className="theme-chat-thread mb-4 mt-4 flex min-h-0 w-full max-w-[700px] flex-1 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-black/15">
              <div
                ref={messageListRef}
                className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
              >
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-7 sm:text-[15px] ${
                        message.role === 'user'
                          ? 'theme-chat-user-bubble bg-[#1488fc] text-white shadow-[0_10px_30px_rgba(20,136,252,0.25)]'
                          : 'theme-chat-assistant-bubble theme-chat-menu border border-white/10 bg-white/[0.04] text-zinc-100'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {isSending ? (
                  <div className="flex justify-start">
                    <div className="theme-chat-loading-bubble theme-chat-menu rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">
                      BlackLogix AI is analyzing...
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="theme-chat-error mb-4 w-full max-w-[700px] rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="mt-auto w-full max-w-[700px]">
            <ChatInput placeholder={placeholder} onSend={onSend} onInvestigate={onInvestigate} />
          </div>

          {!hasMessages ? <div className="mt-6"><ImportButtons onImport={onImport} /></div> : null}
        </div>
      </div>
    </div>
  )
}
