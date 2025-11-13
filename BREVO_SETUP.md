# Brevo Email Setup

Deze handleiding beschrijft hoe je Brevo (voorheen SendinBlue) kunt instellen voor het versturen van inspectierapporten.

---

## 🚀 Overzicht

De applicatie verstuurt geautomatiseerde inspectierapporten naar het routecontact van een klant via de **Brevo API** (voorheen SendinBlue).

---

## ✅ Stappenplan

### Stap 1: Brevo Account Aanmaken

1. **Ga naar [Brevo.com](https://www.brevo.com)** en klik op "Sign Up Free".
2. Kies het **Free Plan**:
   - **300 emails per dag** (gratis!)
   - Ruim voldoende voor productiegebruik
   - Geen creditcard nodig
3. Volg de stappen om je account aan te maken en te verifiëren.

---

### Stap 2: Brevo API Key Genereren

1. Log in op je Brevo account.
2. Klik rechtsboven op je **naam** → **SMTP & API**.
3. Scroll naar beneden naar **API Keys**.
4. Klik op **"Create a new API key"**.
5. Geef de API Key een naam (bijv. `Lavans Inspectie App`).
6. **Kopieer de gegenereerde API Key direct!** Deze wordt slechts één keer getoond.
   - Formaat: `xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxx`

---

### Stap 3: Afzender Email Verifiëren

Brevo vereist dat je het afzender emailadres verifieert.

1. Log in op je Brevo account.
2. Ga naar **Senders & IP** (in het menu).
3. Klik op **"Add a sender"**.
4. Vul in:
   - **Email**: `inspectie@lavans.nl` (of je gewenste afzender adres)
   - **Name**: `Lavans Service`
5. Brevo stuurt een **verificatie-email** naar dit adres.
6. Open de email en klik op de verificatielink.
7. Zodra geverifieerd, kan je dit adres gebruiken als afzender.

**Tip**: Als je geen toegang hebt tot `inspectie@lavans.nl`, kun je eerst een persoonlijk emailadres verifiëren (bijv. `michiel@lavans.nl`) en later overschakelen.

---

### Stap 4: Azure Static Web App Configuratie

De Brevo API Key en afzender instellingen moeten als omgevingsvariabelen worden ingesteld in Azure.

1. Ga naar de **Azure Portal**.
2. Navigeer naar je **Static Web App** resource.
3. Klik in het linkermenu op **Configuration** (onder "Settings").
4. Voeg de volgende **nieuwe applicatie-instellingen** toe:

| **Naam** | **Waarde** | **Beschrijving** |
|----------|------------|------------------|
| `BREVO_API_KEY` | `xkeysib-xxxx...` | Je Brevo API Key |
| `FROM_EMAIL` | `inspectie@lavans.nl` | Afzender emailadres |
| `FROM_NAME` | `Lavans Service` | Afzender naam |

5. Klik op **Save**.
6. De Static Web App zal automatisch herstarten (duurt ~30 seconden).

---

## 🧪 Testen

### Via de App:

1. Open de **Lavans Service App** in je browser.
2. Voer een **inspectie** uit en sla deze op.
3. Klik op de **"Email Versturen"** knop.
4. Als alles correct is geconfigureerd:
   - ✅ Je ziet een succesmelding
   - 📧 De klant ontvangt de email binnen 1 minuut

### Zonder Brevo API Key:

- Als `BREVO_API_KEY` **niet** is ingesteld, zie je:
  ```
  ⚠️ Email preview gegenereerd (Brevo niet geconfigureerd)
  ```
- De email wordt **gelogd** in de Azure Function logs, maar **niet verzonden**.

---

## 🔍 Troubleshooting

### 1. **Email komt niet aan**

**Check:**
- ✅ Is `BREVO_API_KEY` correct ingesteld in Azure Configuration?
- ✅ Is `FROM_EMAIL` geverifieerd in Brevo (Senders & IP)?
- ✅ Check de **Brevo Logs**:
  - Log in op Brevo → **Campaigns** → **Transactional** → **Email Logs**
  - Zie je de email daar? Status?
- ✅ Check de **spamfolder** van de ontvanger.
- ✅ Check de **Azure Function logs**:
  - Azure Portal → Static Web App → Functions → `send-inspectie-email` → Monitor

### 2. **Foutmelding: "Brevo fout: 401"**

**Oorzaak**: Ongeldige of verlopen API Key.

**Oplossing**:
- Genereer een nieuwe API Key in Brevo.
- Update `BREVO_API_KEY` in Azure Configuration.

### 3. **Foutmelding: "Brevo fout: 400 - Invalid sender"**

**Oorzaak**: Het `FROM_EMAIL` adres is niet geverifieerd in Brevo.

**Oplossing**:
- Ga naar Brevo → Senders & IP → Add/verify sender.

### 4. **Foutmelding: "Daily sending limit exceeded"**

**Oorzaak**: Je hebt het gratis dagelijkse limiet (300 emails) bereikt.

**Oplossing**:
- Upgrade naar een betaald Brevo plan, of
- Wacht tot de volgende dag (limiet reset om middernacht UTC).

---

## 💰 Kosten & Limieten

| **Plan** | **Emails/dag** | **Kosten** |
|----------|----------------|------------|
| **Free** | 300 | €0 |
| **Lite** | 10.000 | €25/maand |
| **Business** | 20.000 | €65/maand |
| **Enterprise** | Onbeperkt | Op aanvraag |

**Voor de meeste bedrijven is het Free plan ruim voldoende.**

---

## 📊 SQL Queries voor Email Logs

### Laatste 20 verzonden emails:

```sql
SELECT TOP 20
    LogID,
    Timestamp,
    JSON_VALUE(RequestBody, '$.to') AS Ontvanger,
    JSON_VALUE(RequestBody, '$.subject') AS Onderwerp,
    StatusCode,
    CASE 
        WHEN StatusCode = 200 THEN '✅ Verzonden'
        ELSE '❌ Fout'
    END AS Status,
    InspectieID,
    ErrorMessage
FROM dbo.ApiLogs
WHERE Endpoint = '/api/send-inspectie-email'
ORDER BY Timestamp DESC;
```

### Verzonden emails per dag:

```sql
SELECT 
    CAST(Timestamp AS DATE) AS Datum,
    COUNT(*) AS AantalEmails,
    SUM(CASE WHEN StatusCode = 200 THEN 1 ELSE 0 END) AS Gelukt,
    SUM(CASE WHEN StatusCode <> 200 THEN 1 ELSE 0 END) AS Mislukt
FROM dbo.ApiLogs
WHERE Endpoint = '/api/send-inspectie-email'
GROUP BY CAST(Timestamp AS DATE)
ORDER BY Datum DESC;
```

---

## 🔗 Brevo Resources

- **Dashboard**: [https://app.brevo.com](https://app.brevo.com)
- **API Documentatie**: [https://developers.brevo.com/docs](https://developers.brevo.com/docs)
- **Email Logs**: [https://app.brevo.com/log](https://app.brevo.com/log)
- **Senders & IP**: [https://app.brevo.com/senders](https://app.brevo.com/senders)

---

## ✅ Checklist

- [ ] Brevo account aangemaakt
- [ ] API Key gegenereerd en opgeslagen
- [ ] Afzender email geverifieerd in Brevo
- [ ] `BREVO_API_KEY` toegevoegd aan Azure Configuration
- [ ] `FROM_EMAIL` en `FROM_NAME` toegevoegd aan Azure Configuration
- [ ] Testmail verzonden via de app
- [ ] Email ontvangen en gecontroleerd
- [ ] Email Logs gecontroleerd in Brevo dashboard

---

**Klaar!** 🎉 Je kunt nu geautomatiseerde inspectierapporten versturen via Brevo.

