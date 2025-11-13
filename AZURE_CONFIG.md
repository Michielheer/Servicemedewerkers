# Azure Configuration - SMTP Instellingen

## 🎯 Wat Je Moet Doen

Voeg deze 6 variabelen toe aan je Azure Static Web App configuratie.

---

## 📋 Stap-voor-Stap

### 1. Open Azure Portal
- Ga naar: [https://portal.azure.com](https://portal.azure.com)
- Log in met je Azure account

### 2. Zoek Je Static Web App
- Zoekbalk bovenaan: typ `agreeable-bush-0adda8c03`
- Klik op je Static Web App

### 3. Open Configuration
- Klik in het **linkermenu** op **"Configuration"** (onder "Settings")
- Je ziet nu "Application settings"

### 4. Voeg Variabelen Toe

Klik **6 keer** op **"+ Add"** en voeg deze in:

#### Variabele 1:
```
Name:  SMTP_HOST
Value: smtp-relay.brevo.com
```
Klik **OK**

#### Variabele 2:
```
Name:  SMTP_PORT
Value: 587
```
Klik **OK**

#### Variabele 3:
```
Name:  SMTP_USER
Value: [jouw-brevo-login]@smtp-brevo.com
```
Klik **OK**

**BELANGRIJK:** Gebruik je EIGEN Brevo SMTP login (zie Brevo dashboard → SMTP & API)

#### Variabele 4:
```
Name:  SMTP_PASS
Value: [jouw-brevo-wachtwoord]
```
Klik **OK**

**BELANGRIJK:** Gebruik je EIGEN Brevo SMTP wachtwoord (zie Brevo dashboard → SMTP & API)

#### Variabele 5:
```
Name:  FROM_EMAIL
Value: michiel.heerkens@lavans.nl
```
Klik **OK**

#### Variabele 6:
```
Name:  FROM_NAME
Value: Lavans Service
```
Klik **OK**

#### Variabele 7 (TEST MODE):
```
Name:  EMAIL_TEST_MODE
Value: true
```
Klik **OK**

#### Variabele 8 (TEST EMAIL):
```
Name:  EMAIL_TEST_RECIPIENT
Value: michiel@datametrics.nl
```
Klik **OK**

### 5. Opslaan
- Klik bovenaan op **"Save"**
- Klik **"Continue"** bij de waarschuwing
- Wacht ~30 seconden (app herstart automatisch)

---

## ✅ Checklist

- [ ] SMTP_HOST toegevoegd
- [ ] SMTP_PORT toegevoegd
- [ ] SMTP_USER toegevoegd
- [ ] SMTP_PASS toegevoegd
- [ ] FROM_EMAIL toegevoegd
- [ ] FROM_NAME toegevoegd
- [ ] EMAIL_TEST_MODE toegevoegd (= true)
- [ ] EMAIL_TEST_RECIPIENT toegevoegd (= michiel@datametrics.nl)
- [ ] Alles opgeslagen (Save knop)
- [ ] 30 seconden gewacht

---

## 🧪 Testen

Na configuratie:

1. Open: `https://agreeable-bush-0adda8c03.3.azurestaticapps.net`
2. Voer een inspectie uit bij een klant
3. Klik op **"Email Versturen"**
4. Check je inbox (**michiel@datametrics.nl**) of de email aankomt

**Verwacht resultaat:**
```
✅ Email succesvol verzonden naar michiel@datametrics.nl
```

**Let op:** Door TEST MODE worden ALLE emails naar `michiel@datametrics.nl` gestuurd, ongeacht welke klant je selecteert!

---

## 🔄 Test Mode Uitschakelen (Later)

Als je klaar bent met testen en emails naar echte klanten wilt sturen:

1. Ga naar Azure → Configuration
2. Verwijder of wijzig `EMAIL_TEST_MODE` naar `false`
3. Verwijder `EMAIL_TEST_RECIPIENT` (optioneel)
4. Klik Save
5. Emails gaan nu naar de echte routecontacten!

---

## 🔍 Troubleshooting

### Email komt niet aan?

**Check 1: Azure Configuration**
- Ga terug naar Configuration
- Controleer of alle 6 variabelen er staan
- Controleer op typefouten (vooral bij wachtwoord!)

**Check 2: Azure Function Logs**
- Static Web App → Functions → `send-inspectie-email` → Monitor
- Zie je foutmeldingen?

**Check 3: Database Logs**
```sql
SELECT TOP 5
    Timestamp,
    StatusCode,
    ErrorMessage
FROM dbo.ApiLogs
WHERE Endpoint = '/api/send-inspectie-email'
ORDER BY Timestamp DESC;
```

**Check 4: Brevo Dashboard**
- Log in op [app.brevo.com](https://app.brevo.com)
- Ga naar Campaigns → Transactional → Email Logs
- Zie je de email daar?

---

## 📞 Hulp Nodig?

Als het niet werkt:
1. Check de Azure Function logs (zie hierboven)
2. Check de database logs (SQL query hierboven)
3. Stuur me een screenshot van de foutmelding

---

## 🎉 Klaar!

Na deze configuratie kan je app automatisch inspectierapporten versturen naar klanten!

