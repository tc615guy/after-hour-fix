# Pre-Launch Customer Checklist
## Before Your First Paying Customer Goes Live

---

## 🔐 **CRITICAL: Environment & Configuration**

### Production Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `NEXT_PUBLIC_APP_URL` = your actual production domain (must be HTTPS)
- [ ] `ENABLE_MOCK_MODE=false`
- [ ] `SKIP_WEBHOOK_VERIFICATION=false`

### API Keys & Secrets
- [ ] `VAPI_API_KEY` = Production API key from Vapi
- [ ] `VAPI_WEBHOOK_URL` = `https://yourdomain.com/api/vapi/webhook`
- [ ] `VAPI_WEBHOOK_SECRET` = Strong random secret (min 32 chars)
- [ ] `STRIPE_SECRET_KEY` = Live Stripe key
- [ ] `STRIPE_WEBHOOK_SECRET` = Live webhook secret
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = Live publishable key
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_STARTER` = Actual Starter plan price ID
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_PRO` = Actual Pro plan price ID

### Database
- [ ] Supabase production database running
- [ ] All Prisma migrations applied: `npx prisma migrate deploy`
- [ ] Database connection tested and stable
- [ ] Backup strategy configured

### Email Configuration
- [ ] Resend API key configured OR Postmark server API key
- [ ] Sender email domain verified
- [ ] Test email sent successfully
- [ ] Email templates rendering correctly

### SMS Configuration (Twilio)
- [ ] `TWILIO_ACCOUNT_SID` configured
- [ ] `TWILIO_AUTH_TOKEN` configured
- [ ] `TWILIO_PHONE_NUMBER` configured and verified
- [ ] **CRITICAL**: Twilio number is verified (not trial number)
- [ ] Test SMS sent successfully
- [ ] Customer phone number format validations working

---

## 📞 **Phone System & Voice AI**

### Vapi Configuration
- [ ] All 3 demo assistants active:
  - Demo Plumbing (`66ac9a80-cee3-4084-95fa-c51ede8ccf5c`)
  - Demo HVAC (`ee143a79-7d18-451f-ae8e-c1e78c83fa0f`)
  - Demo Electrical (`fc94b4f6-0a58-4478-8ba1-a81dd81bbaf5`)
- [ ] All demo phone numbers have `serverUrl` configured
- [ ] `VAPI_WEBHOOK_SECRET` sent to Vapi for webhook authentication
- [ ] Test call made to each demo number → assistant answers
- [ ] Assistant voice sounds natural (Cartesia Ariana voice)

### Phone Number Purchase Flow
- [ ] Customer can purchase number from Settings → Numbers
- [ ] Number automatically attaches to their assistant
- [ ] Webhook URL automatically configured on purchase
- [ ] Fallback destination works if assistant unavailable
- [ ] Numbers display correctly in dashboard

### Webhook Security
- [ ] `VAPI_WEBHOOK_SECRET` set in production
- [ ] Webhook signature verification working
- [ ] Test webhook event received and processed
- [ ] Failed signatures return 401 error

---

## 📅 **Calendar Integration (Cal.com)**

### Cal.com Setup
- [ ] Customer Cal.com account created and verified
- [ ] Cal.com API key obtained and working
- [ ] Default event type configured (trade-specific)
- [ ] Schedule/availability configured
- [ ] Test booking created in Cal.com manually

### Auto-Connection Flow
- [ ] Customer can connect Cal.com from Settings → Scheduling
- [ ] API key verification working
- [ ] Event type auto-creates on first connect
- [ ] Availability fetch working: `GET /api/calcom/availability`
- [ ] Import from Cal.com working: `POST /api/scheduling/import`
- [ ] Export to Cal.com working: `POST /api/scheduling/export`

### Booking Confirmation Flow
- [ ] Assistant calls `book_slot` with all required fields
- [ ] Booking created in database with `pending` status
- [ ] Cal.com booking created successfully
- [ ] Database booking updated to `booked` with `calcomBookingId`
- [ ] SMS confirmation sent to customer
- [ ] Email confirmation sent to customer (if configured)
- [ ] Assistant says: "You're booked for [time]. You'll receive a text confirmation."

---

## 🤖 **AI Assistant Behavior**

### Core Conversation Flow
- [ ] Answers in under 2 seconds
- [ ] Asks ONE question at a time
- [ ] Never repeats information requests
- [ ] Natural, empathetic tone
- [ ] Doesn't sound robotic

### Booking Flow
- [ ] Collects: name, phone, address, issue, time preference
- [ ] Handles apartment/unit numbers correctly
- [ ] Proposes time BEFORE booking
- [ ] Only books after explicit confirmation
- [ ] Handles "ASAP/emergency" → +30 min from now
- [ ] NEVER uses past dates

### Price Quoting
- [ ] Calls `get_pricing` when asked about pricing
- [ ] Accurate trip fee quoted
- [ ] Emergency multiplier applied correctly
- [ ] Doesn't invent prices not in sheet

### Emergency Routing
- [ ] Weekend booking policy enforced
- [ ] On-call technician check working
- [ ] Transfers to live person when appropriate
- [ ] Graceful error handling

---

## 💳 **Payments & Billing**

### Stripe Configuration
- [ ] Live Stripe keys (not test mode)
- [ ] Starter plan: $149/month set up correctly
- [ ] Pro plan: $299/month set up correctly
- [ ] Webhook endpoint receiving events
- [ ] Subscription creation working
- [ ] Subscription cancellation working
- [ ] Billing portal access working: "Manage Billing"

### Subscription Features
- [ ] Starter: 500 minutes/month cap enforced
- [ ] Pro: 1200 minutes/month cap enforced
- [ ] Cap reached → assistant transfers to human
- [ ] Free trial period working (14 days)
- [ ] Trial expiry → billing starts automatically

### Minute Tracking
- [ ] Minutes counted per call correctly
- [ ] Dashboard shows remaining minutes
- [ ] Cap warnings displayed before limit
- [ ] Usage resets monthly correctly

---

## 👤 **User Experience**

### Onboarding Flow
- [ ] Customer signs up → redirected to onboarding
- [ ] Business name, trade, timezone captured
- [ ] Phone number purchase or forwarding choice
- [ ] Business hours configuration working
- [ ] Pricing sheet upload working (CSV)
- [ ] Cal.com connection working
- [ ] On-call technicians added successfully
- [ ] Enhanced settings checklist displaying

### Settings Checklist
- [ ] 8 tasks showing correctly:
  1. Get Your Phone Number ✓
  2. Set Business Hours ✓
  3. Upload Your Pricing ✓
  4. Connect Cal.com ✓
  5. Add On-Call Technicians ✓
  6. Configure AI Assistant ✓
  7. Set Response Templates ✓
  8. Upload Knowledge Base ✓
- [ ] Checkboxes save to localStorage
- [ ] Auto-complete working for configured features
- [ ] "Configure" buttons link to correct tabs
- [ ] Categories (Essentials, Recommended, Advanced, Optional) displaying

### Dashboard
- [ ] Recent calls displaying
- [ ] Recent bookings displaying
- [ ] Statistics accurate: calls, bookings, revenue
- [ ] "Purchase Number" call-to-action if no number

---

## 🛡️ **Security & Compliance**

### Authentication
- [ ] Supabase magic link email sending
- [ ] Session cookies working
- [ ] Auto-redirect after login working
- [ ] Project access control enforced
- [ ] Can't access other customers' data

### API Security
- [ ] Rate limiting working (Upstash or in-memory)
- [ ] Input validation on all endpoints (Zod)
- [ ] SQL injection protection (Prisma parameterized queries)
- [ ] XSS protection (React escaping)
- [ ] CSRF protection (Next.js built-in)

### Data Privacy
- [ ] Customer data encrypted at rest
- [ ] Calls/transcripts stored securely
- [ ] No hardcoded secrets in code
- [ ] .env file git-ignored

---

## 🧪 **Testing Checklist**

### Manual Testing
- [ ] **Test Call 1**: Book a plumbing emergency
  - AI answers naturally
  - Collects all info correctly
  - Creates booking with correct time
  - SMS received by test number
  
- [ ] **Test Call 2**: Ask about pricing
  - Calls `get_pricing` function
  - Quotes accurate trip fee
  - Handles emergency multiplier correctly

- [ ] **Test Call 3**: Weekend booking attempt
  - Weekend policy enforced correctly
  - Offers Monday morning alternative
  - On-call tech check working

- [ ] **Test Call 4**: Duplicate booking prevention
  - Existing booking within 7 days detected
  - Asks to reschedule correctly

- [ ] **Webhook Test**: Simulate call end
  - Call transcript saved to database
  - Minutes counted correctly
  - Dashboard updates in real-time

### Browser Testing
- [ ] Chrome (desktop)
- [ ] Safari (desktop)
- [ ] Firefox (desktop)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Critical Paths
- [ ] Sign up → Onboard → Make first call → Receive SMS
- [ ] Dashboard → Settings → Purchase number → Test call
- [ ] Settings → Upload pricing → Push to assistant → Test pricing quote
- [ ] Settings → Connect Cal.com → Import bookings → Export bookings

---

## 📧 **Communication Templates**

### Email Templates
- [ ] Magic link login email sending
- [ ] Booking confirmation email rendering
- [ ] Weekly digest email template ready
- [ ] Welcome email template ready

### SMS Templates
- [ ] Booking confirmation SMS sending
- [ ] Phone number formatting working
- [ ] Character limit respected (160 chars)

### Notifications
- [ ] Owner notified on escalation
- [ ] Error alerts logging to console
- [ ] Failed bookings logged to database

---

## 🐛 **Known Issues & Workarounds**

### Document Any Known Bugs
- [ ] List any non-critical bugs
- [ ] Workarounds documented for customer support
- [ ] Timeline for fixes

### Error Handling
- [ ] Graceful error messages to users
- [ ] Helpful instructions when things fail
- [ ] 404 pages render correctly
- [ ] 500 errors logged to Sentry (if configured)

---

## 📊 **Monitoring & Analytics**

### Logging
- [ ] All API calls logging to console
- [ ] Webhook events logging
- [ ] Errors logging with stack traces
- [ ] Sensitive data NOT logged

### Error Tracking (Optional)
- [ ] Sentry DSN configured
- [ ] Source maps uploaded to Sentry
- [ ] Alert emails configured

### Metrics (Optional)
- [ ] Call success rate tracked
- [ ] Booking completion rate tracked
- [ ] Average call duration tracked

---

## 🚀 **Launch Day Checklist**

### Customer Onboarding
- [ ] Have live demo ready for first call
- [ ] First customer has Cal.com connected
- [ ] First customer has pricing uploaded
- [ ] First customer has business hours set
- [ ] First customer's phone number purchased and active

### Support Readiness
- [ ] Support email configured: support@yourdomain.com
- [ ] Support documentation ready
- [ ] Common questions documented
- [ ] Escalation process defined

### Legal & Compliance
- [ ] Terms of Service linked in footer
- [ ] Privacy Policy linked in footer
- [ ] Refund policy documented
- [ ] Subscription cancellation process clear

---

## 🎯 **Success Criteria for First Customer**

### Minimum Viable Launch
- [ ] One successful call answered by AI
- [ ] One booking created and confirmed via SMS
- [ ] Booking appears in Cal.com
- [ ] Dashboard shows the call and booking
- [ ] Customer receives confirmation SMS

### Next-Level Success
- [ ] Multiple calls handled successfully
- [ ] Pricing quoted accurately
- [ ] Emergency routing working
- [ ] Weekend bookings handled correctly
- [ ] Customer says: "This is amazing, I'm keeping it!"

---

## 🆘 **Emergency Contacts**

### Vendor Support
- **Vapi**: support@vapi.ai or [Vapi Discord](https://discord.gg/vapi)
- **Stripe**: https://stripe.com/support
- **Cal.com**: https://cal.com/support
- **Supabase**: https://supabase.com/support
- **Twilio**: https://support.twilio.com

### Internal Contacts
- Developer: [Your name/email]
- Support Lead: [Your name/email]
- Emergency Hotline: [Phone if needed]

---

## ✅ **Final Sign-Off**

**Ready for Launch:**
- [ ] All critical items checked
- [ ] Test calls completed successfully
- [ ] First customer selected and onboarded
- [ ] Support system ready
- [ ] Monitoring in place

**Sign-off by:**
- Name: _____________________
- Date: _____________________
- Confidence Level: [ ] 100% Ready [ ] 95% Ready [ ] 90% Ready [ ] Issues Remain

---

## 📝 **Post-Launch Notes**

### What Went Well
1. 
2. 
3. 

### What Needs Improvement
1. 
2. 
3. 

### Customer Feedback
1. 
2. 
3. 

---

**Good luck with the launch! 🚀**

Remember: Ship it, then iterate. You can always fix bugs, but you can't book customers if you never launch.

