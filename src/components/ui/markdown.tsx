'use client'

import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

type MarkdownProps = {
  content: string
  className?: string
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <ReactMarkdown
      className={cn(
        'prose prose-sm max-w-none dark:prose-invert',
        // Headings
        'prose-headings:font-heading prose-headings:tracking-tight',
        'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm',
        'prose-h1:mt-4 prose-h2:mt-3 prose-h3:mt-2',
        // Paragraphs
        'prose-p:leading-relaxed prose-p:text-foreground/90',
        // Lists
        'prose-ul:my-2 prose-ol:my-2',
        'prose-li:my-0.5 prose-li:marker:text-primary',
        // Strong/Bold
        'prose-strong:font-semibold prose-strong:text-foreground',
        // Links
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        // Code
        'prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-sm',
        'prose-code:before:content-none prose-code:after:content-none',
        className
      )}
    >
      {content}
    </ReactMarkdown>
  )
}
