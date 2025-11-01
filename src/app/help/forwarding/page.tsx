export default function ForwardingHelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Conditional Forwarding Instructions</h1>
          <p className="text-sm text-gray-600">Set your number to forward to your AfterHourFix AI.</p>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <section className="bg-white border rounded p-4">
          <h2 className="text-lg font-semibold mb-2">VoIP / PBX Providers</h2>
          <ul className="list-disc pl-6 space-y-1 text-sm text-gray-800">
            <li><strong>RingCentral / Nextiva / Zoom / Teams</strong>: Admin Portal → Phone Numbers → Call Handling / Schedules → Add <em>After Hours</em> rule → <em>Forward</em> to your AI number (E.164). Save & publish.</li>
            <li><strong>All Hours w/ No Answer</strong>: Call Handling → <em>When unanswered</em> → Forward to AI number after 2–5 rings.</li>
          </ul>
        </section>
        <section className="bg-white border rounded p-4">
          <h2 className="text-lg font-semibold mb-2">Mobile Carriers</h2>
          <p className="text-sm text-gray-800 mb-2">Most consumer plans support unconditional forwarding codes only. For schedules, use your carrier’s business portal/app or attach your line to a VoIP system.</p>
          <ul className="list-disc pl-6 space-y-1 text-sm text-gray-800">
            <li><strong>AT&amp;T / Verizon / T‑Mobile</strong>: Unconditional forward = dial <code>*72</code> then your AI number; cancel = <code>*73</code>.</li>
            <li><strong>Conditional (No Answer / Busy)</strong>: Check your carrier’s app or business portal. Not all plans allow conditional codes.</li>
          </ul>
        </section>
        <section className="bg-white border rounded p-4">
          <h2 className="text-lg font-semibold mb-2">Tips</h2>
          <ul className="list-disc pl-6 space-y-1 text-sm text-gray-800">
            <li>Use <strong>After Hours Only</strong> schedule to keep your personal calls ringing your phone during the day.</li>
            <li>Use <strong>No Answer → AI</strong> if you want the AI to catch missed calls anytime.</li>
            <li>Test after saving: place a call after hours and verify the AI answers.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}

