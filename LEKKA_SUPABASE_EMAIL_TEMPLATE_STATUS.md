# Lekka Supabase Auth Email Template Status

The connected Supabase project is `local-radar-sa` (`vnitwsjidlurlwlpsmtf`). The Auth > Emails > Reset password editor is reachable and currently shows the default reset-password template.

Supabase displays the explicit notice: "Set up custom SMTP to edit templates. Emails will be sent using the default templates." The editor exposes the subject and preview/source controls, but the project currently does not permit saving a custom subject/body until custom SMTP is configured.

Current Lekka visual tokens to use in the template:

| Token | Light | Dark |
|---|---|---|
| Primary amber | #E9A23B | #F2B451 |
| Background | #F7F8F5 | #111816 |
| Surface | #FFFFFF | #1B2421 |
| Foreground | #10211D | #F4F7F2 |
| Muted | #63736D | #A5B4AD |
| Border | #DDE5DF | #33433D |
| Success green | #2F7D67 | #65B59B |
| Error red | #D95D4F | #F17C6D |

Required dashboard prerequisite: configure a custom SMTP provider under Supabase Auth > Emails > SMTP Settings. Once configured, the confirmation and reset-password templates can be edited and saved with Lekka branding.
