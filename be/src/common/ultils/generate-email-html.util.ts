export function generateEmailHTML({
  name,
  message,
  buttonText,
  link,
}: {
  name: string;
  message: string;
  buttonText: string;
  link: string;
}) {
  const currentYear = new Date().getFullYear();

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>EDUMEE</title>
      <style>
        /* Base / Reset */
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px; color: #1f2937; -webkit-font-smoothing: antialiased; }
        .email-wrapper { max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; }

        /* Top Accent Banner */
        .top-accent { height: 6px; background: linear-gradient(90deg, #1A365D 0%, #00bac6 100%); }

        /* Main Content */
        .content-body { padding: 48px 40px; }

        /* Branding */
        .brand-header { text-align: center; margin-bottom: 40px; }
        .brand-header img { width: 140px; height: auto; margin-bottom: 16px; }
        .brand-header h1 { font-size: 26px; color: #1A365D; margin: 0 0 4px 0; font-weight: 800; letter-spacing: -0.5px; }
        .brand-header p { font-size: 13px; color: #008ba3; margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; }

        /* Typography */
        .greeting { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; }
        .main-text { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 32px; }

        /* Call to Action Button */
        .cta-container { text-align: center; margin: 40px 0; }
        .cta-button { background-color: #1A365D; color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: all 0.2s ease; box-shadow: 0 4px 6px -1px rgba(26, 54, 93, 0.2); }
        .cta-button:hover { background-color: #11243D; transform: translateY(-1px); box-shadow: 0 6px 8px -1px rgba(26, 54, 93, 0.3); }

        /* Fallback Link Box (Fixed for long tokens) */
        .fallback-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px; }
        .fallback-instruction { font-size: 13px; color: #64748b; margin: 0 0 12px 0; font-weight: 500; }
        .fallback-link { display: block; font-size: 14px; color: #0284c7; text-decoration: none; font-weight: 400; word-break: break-all; /* Ép dòng để không vỡ layout */ line-height: 1.5; }
        .fallback-link:hover { text-decoration: underline; }

        /* Footer */
        .footer { background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { font-size: 12px; color: #64748b; margin: 0 0 8px 0; line-height: 1.5; }
        .footer-links { margin-top: 16px; }
        .footer-links a { color: #94a3b8; text-decoration: none; margin: 0 10px; font-size: 12px; }
        .footer-links a:hover { color: #64748b; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="top-accent"></div>

        <div class="content-body">
          <div class="brand-header">
            <img src="https://i.postimg.cc/nLbJVM7g/Logo-EXE.png" alt="EDUMEE Logo" />
            <h1>EDUMEE</h1>
            <p>Career mode for you</p>
          </div>

          <div class="greeting">Hello ${name},</div>

          <div class="main-text">
            ${message}
          </div>

          <div class="cta-container">
            <a href="${link}" class="cta-button" target="_blank">${buttonText}</a>
          </div>

          <div class="fallback-box">
            <p class="fallback-instruction">If the button doesn't work, copy and paste this link into your browser:</p>
            <a href="${link}" class="fallback-link" target="_blank">${link}</a>
          </div>
        </div>

        <div class="footer">
          <p>This secure link is valid for <strong>24 hours</strong>. If you did not request this email, please ignore it.</p>
          <p>&copy; ${currentYear} EDUMEE. All rights reserved.</p>
          <div class="footer-links">
            <a href="#">Help Center</a> &bull;
            <a href="#">Privacy Policy</a> &bull;
            <a href="#">Contact Us</a>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
}
