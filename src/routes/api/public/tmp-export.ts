import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/tmp-export')({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const [campaigns, questions] = await Promise.all([
          supabaseAdmin.from('pmma_campaigns').select('*').order('display_order'),
          supabaseAdmin.from('pmma_questions').select('*').order('sort_order'),
        ])
        return new Response(
          JSON.stringify({ campaigns: campaigns.data, questions: questions.data }),
          { headers: { 'content-type': 'application/json' } },
        )
      },
    },
  },
})
