// Public values only. Never put a Supabase service-role key in browser code.
const CFG = {
  SUPABASE_URL: 'https://lbtuwjvqzrguusptlkmv.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidHV3anZxenJndXVzcHRsa212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMTg2NTYsImV4cCI6MjExMDc5NDY1Nn0.LGYcF5rg5W4WJ6O4J715QDXtKS7p_brAF0J9gRPYm1U',
  // EmailJS template variables: name, email, phone, make, model, variant, part_no, details, kind, kind_label, submitted_at, is_order, orders[], total, payment_method
  EMAILJS: { publicKey: '50StmFvVyaeZW-TtQ', serviceId: 'service_jovf0ls', templateId: 'template_92780hs' },
  WHATSAPP: '15023029267', // international format, digits only
  PHONE: '+16062630619',
  EMAIL: 'usaautopartsforsale@gmail.com',
  CURRENCY: '$',
  WIRE_MIN: 2000 // wire transfer is offered when the order total is above this amount
};
