# 📧 Email Functionaliteit Setup

## Wat doet het?

Na het opslaan van een inspectie kun je **automatisch een email** versturen naar het **routecontact** van de klant met:
- ✅ Inspectie samenvatting
- 📊 Aantallen (matten, wissers, toebehoren)
- ⚠️ Geconstateerde problemen
- 👤 Inspecteur naam en datum

---

## Setup: SendGrid API Key

### Stap 1: SendGrid Account Aanmaken (Gratis)

1. Ga naar [https://sendgrid.com/](https://sendgrid.com/)
2. **Sign Up** → Kies **Free Plan** (100 emails/dag gratis)
3. Vul je gegevens in en bevestig je email

### Stap 2: API Key Aanmaken

1. Log in op SendGrid
2. Ga naar **Settings** → **API Keys**
3. Klik op **Create API Key**
4. Naam: `Lavans Service App`
5. Permissions: **Full Access**
6. Klik **Create & View**
7. **Kopieer de API key** (begint met `SG.`)

⚠️ **Let op**: De key wordt maar 1x getoond!

### Stap 3: Sender Verificatie

SendGrid vereist dat je een **verzender email** verifieert:

1. Ga naar **Settings** → **Sender Authentication**
2. Klik op **Verify a Single Sender**
3. Vul in:
   - **From Name**: Lavans Service
   - **From Email**: `inspectie@lavans.nl` (of je eigen domein)
   - **Reply To**: `info@lavans.nl`
   - Adresgegevens (vereist door anti-spam wetgeving)
4. Klik **Create**
5. **Bevestig de verificatie email** die je ontvangt

### Stap 4: Azure Static Web Apps Configuratie

1. Ga naar **Azure Portal**
2. Open je **Static Web App** (`agreeable-bush-0adda8c03`)
3. Ga naar **Configuration**
4. Klik **+ Add** en voeg toe:

| Name | Value |
|------|-------|
| `SENDGRID_API_KEY` | `SG.xxxxxxxxxxxxxxxxxxxxx` (je API key) |
| `FROM_EMAIL` | `inspectie@lavans.nl` (geverifieerde email) |

5. Klik **Save**
6. Wacht 1-2 minuten tot de configuratie is toegepast

---

## Gebruik

### In de App:

1. **Vul inspectie in**
2. Klik **Inspectie Opslaan**
3. In het "Inspectie Afgerond" scherm zie je:
   - ✅ Inspectie opgeslagen
   - 📧 **Email Versturen** knop
   - 🆕 Nieuwe Inspectie knop

4. Klik **📧 Email Versturen**
5. De app:
   - Zoekt het **routecontact** van de klant
   - Genereert een mooie HTML email
   - Verstuurt via SendGrid
   - Toont bevestiging: `📧 Email verzonden naar xxx@yyy.nl`

---

## Email Template

De email bevat:

### Header
- 🔍 Service Inspectie Rapport
- Inspectie # en datum

### Inhoud
- Persoonlijke groet met contactpersoon naam
- 📊 Statistieken (aantal matten, wissers, etc.)
- ⚠️ Aandachtspunten (als er problemen zijn)
- ✅ "Alles in orde!" (als er geen problemen zijn)

### Footer
- Inspecteur naam
- Lavans contactgegevens

---

## Routecontact Logica

De app zoekt email in deze volgorde:

1. **Inspectie ContactEmail** (als ingevuld bij inspectie)
2. **Contactpersonen tabel**:
   - `routecontact = 1` (routecontact vinkje aan)
   - `nog_in_dienst = 1` (nog actief)
   - `email IS NOT NULL` (email adres ingevuld)

Als **geen email** gevonden: error melding.

---

## Testing (Zonder SendGrid)

Als je **geen SendGrid API Key** configureert:

- De app genereert een **preview** van de email
- Je ziet: `⚠️ Email preview gegenereerd (SendGrid niet actief)`
- In de **Azure Function Logs** zie je de email HTML

Dit is handig voor development/testing.

---

## Troubleshooting

### "Email kon niet worden verzonden"

**Oplossing**:
1. Check of `SENDGRID_API_KEY` in Azure Configuration staat
2. Check of `FROM_EMAIL` geverifieerd is in SendGrid
3. Bekijk **Azure Function Logs** voor details:
   - Azure Portal → Static Web App → Functions → send-inspectie-email → Logs

### "Geen geldig email adres gevonden"

**Oplossing**:
- Check of klant een **routecontact** heeft met email adres
- Ga naar **Contactpersonen** tab in app
- Vink **Routecontact** aan bij juiste persoon
- Voeg email adres toe

### SendGrid "Sender not verified"

**Oplossing**:
- Ga naar SendGrid → Settings → Sender Authentication
- Check of je email adres **Verified** status heeft
- Zo niet: klik Resend Verification

---

## Kosten

**SendGrid Free Plan**:
- 100 emails/dag
- Gratis voor altijd
- Voldoende voor meeste gebruik

**Als je meer nodig hebt**:
- Essentials: €19,95/maand = 40.000 emails
- Pro: €89,95/maand = 100.000 emails

---

## SQL Logging

Elke email poging wordt gelogd in `dbo.ApiLogs`:

```sql
SELECT TOP 20
    LogID,
    Timestamp,
    Endpoint,
    RequestBody AS EmailRecipient,
    ResponseBody AS EmailSubject,
    StatusCode,
    InspectieID
FROM dbo.ApiLogs
WHERE Endpoint = '/api/send-inspectie-email'
ORDER BY Timestamp DESC;
```

---

## Volgende Stappen

✅ API endpoint gemaakt  
✅ Email template gemaakt  
✅ Knop toegevoegd aan UI  
⏳ **Nog te doen**: SendGrid API Key configureren in Azure

**Na configuratie ben je klaar!** 🎉

