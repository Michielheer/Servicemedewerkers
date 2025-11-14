# Compleet Overzicht - Alle TODO's en Controles

## 📋 Inhoudsopgave

1. [Service TODO's](#service-todos) - Voor servicemedewerkers
2. [Klantenservice TODO's](#klantenservice-todos) - Voor klantenservice team
3. [Wanneer Worden TODO's Gegenereerd](#wanneer-worden-todos-gegenereerd)
4. [Prioriteiten](#prioriteiten)

---

## 🔧 Service TODO's

Deze TODO's verschijnen voor **servicemedewerkers** en vereisen actie in het veld of in TMS.

### **1. Matten - Aanwezigheid**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Mat niet aanwezig | `Controleer waarom mat '[naam]' ([locatie]) niet aanwezig is.` | 🔴 Kritiek |
| Aantal = 0 | `Controleer of mat '[naam]' ([locatie]) verwijderd moet worden.` | 🟡 Normaal |

**Voorbeeld:**
```
❌ Controleer waarom mat 'Effekt mat 90x150' (Kantine, Ingang) niet aanwezig is.
⚠️ Controleer of mat 'Effekt mat 60x85' (Entree) verwijderd moet worden.
```

---

### **2. Matten - Conditie**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Sterk vervuild | `Mat '[naam]' ([locatie]) vervangen of reinigen (sterk vervuild).` | 🔴 Kritiek |
| Niet schoon/beschadigd | `Mat '[naam]' ([locatie]) inspecteren op schade.` | 🟡 Normaal |

**Voorbeeld:**
```
🔴 Mat 'Effekt mat 90x150' (Kantine) vervangen of reinigen (sterk vervuild).
🟡 Mat 'Logomat Custom' (Entree) inspecteren op schade.
```

---

### **3. Matten - Opmerkingen**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Opmerking ingevuld | `Controleer opmerking bij mat '[naam]' ([locatie]): [opmerking]` | 🟡 Normaal |

**Voorbeeld:**
```
⚠️ Controleer opmerking bij mat 'Logomat Custom' (Entree): Klant wil andere kleur
```

---

### **4. Matten - TMS Data Kwaliteit**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Afdeling + Ligplaats = "Algemeen" | `Ligplaats controleren en aanpassen in TMS voor mat [naam] (nu: Algemeen/Algemeen).` | 🟡 Normaal |

**Voorbeeld:**
```
📍 Ligplaats controleren en aanpassen in TMS voor mat Effekt mat 60x85 (nu: Algemeen/Algemeen).
```

---

### **5. Logomatten - Leeftijd (4+ jaar)**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Leeftijd ≥ 4 jaar EN representativiteit < 70% | `Logomat '[naam]' ([locatie]) moet vervangen worden: ouder dan 4 jaar en representativiteitsscore te laag.` | 🟡 Normaal |

**Voorbeeld:**
```
🎨 Logomat 'Custom Logo 90x150' (Entree) moet vervangen worden: ouder dan 4 jaar en representativiteitsscore te laag.
```

---

### **6. Wissers - Aanwezigheid**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Aantal geteld = 0 | `Controleer of wisser van type '[type]' verwijderd moet worden.` | 🟡 Normaal |

**Voorbeeld:**
```
🧹 Controleer of wisser van type 'Microvezeldoek Blauw' verwijderd moet worden.
```

---

### **7. Wissers - Opmerkingen**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Opmerking ingevuld | `Controleer opmerking bij wisser van type '[type]': [opmerking]` | 🟡 Normaal |

**Voorbeeld:**
```
⚠️ Controleer opmerking bij wisser van type 'Microvezeldoek': Klant wil meer voorraad
```

---

### **8. Wissers - Upsell Kans**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Vuil percentage > 70% | `Upsell kans: [type] heeft hoog verbruik ([%]% vuil). Overweeg extra wissers aan te bieden.` | 🟢 Info |

**Voorbeeld:**
```
💰 Upsell kans: Microvezeldoek Blauw heeft hoog verbruik (85% vuil). Overweeg extra wissers aan te bieden.
```

---

### **9. Toebehoren - Vervangen**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Vervangen = true EN aantal > 0 | `Vervang [aantal]x '[type]' bij wissers.` | 🟡 Normaal |

**Voorbeeld:**
```
🔧 Vervang 2x 'Emmer 15L Rood' bij wissers.
```

---

### **10. Toebehoren - Opmerkingen**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Opmerking ingevuld | `Controleer opmerking bij toebehoren '[type]': [opmerking]` | 🟡 Normaal |

**Voorbeeld:**
```
⚠️ Controleer opmerking bij toebehoren 'Mopstok': Stok is gebroken
```

---

## 👥 Klantenservice TODO's

Deze TODO's verschijnen voor het **klantenservice team** en vereisen telefonisch of administratief contact.

### **1. Logomatten - Vernieuwing (3+ jaar)**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Leeftijd ≥ 3 jaar | `Logomat ouder dan 3 jaar bij klant '[naam]': plan nieuwe logomat, check of logo gelijk is gebleven, geef aan dat je een nieuwe gaat bestellen.` | 🟡 Normaal |

**Voorbeeld:**
```
📞 Logomat ouder dan 3 jaar bij klant 'Custom Logo 90x150': plan nieuwe logomat, check of logo gelijk is gebleven, geef aan dat je een nieuwe gaat bestellen.
```

---

### **2. Contactpersonen - Routecontact Email**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Geen routecontact met email | `⚠️ Geen routecontact met emailadres gevonden. Voeg een routecontact toe om inspectierapporten te kunnen emailen.` | 🟡 Normaal |

**Voorbeeld:**
```
📧 ⚠️ Geen routecontact met emailadres gevonden. Voeg een routecontact toe om inspectierapporten te kunnen emailen.
```

---

### **3. Contactpersonen - Nieuwe Contactpersoon**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Nog in dienst = true EN geen email | `Nieuwe contactpersoon toevoegen: [naam]` | 🟡 Normaal |

**Voorbeeld:**
```
➕ Nieuwe contactpersoon toevoegen: Jan de Vries (email nog toevoegen)
```

---

### **4. Contactpersonen - Klantportaal Uitnodiging**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Nog in dienst = true EN geen klantportaal EN email bekend | `Uitnodigen klantportaal voor [email]` | 🟡 Normaal |

**Voorbeeld:**
```
🌐 Uitnodigen klantportaal voor jan.devries@klant.nl
```

---

### **5. Contactpersonen - Niet Meer In Dienst**

| Trigger | TODO Tekst | Prioriteit |
|---------|-----------|------------|
| Nog in dienst = false | `Contactpersoon [naam] ([email]) is niet meer in dienst. Controleer en update CRM.` | 🟡 Normaal |

**Voorbeeld:**
```
👋 Contactpersoon Piet Jansen (piet@klant.nl) is niet meer in dienst. Controleer en update CRM.
```

---

## ⏰ Wanneer Worden TODO's Gegenereerd?

### **Bij Klant Selectie**
- ✅ Routecontact email check
- ✅ Contactpersonen checks (nieuw, niet in dienst, klantportaal)

### **Bij Inspectie Opslaan**
- ✅ Alle matten checks
- ✅ Alle wissers checks
- ✅ Alle toebehoren checks
- ✅ Logomat leeftijd checks
- ✅ Upsell kansen

### **Bij Contactpersonen Tab "Wijzigingen Opslaan"**
- ✅ Contactpersonen wijzigingen (nieuw, klantportaal, niet in dienst)

---

## 🎯 Prioriteiten

### **🔴 Kritiek (Direct Actie Vereist)**
- Mat niet aanwezig
- Mat sterk vervuild

**→ Deze kunnen service verstoring voor klant betekenen**

---

### **🟡 Normaal (Binnen 1-2 Weken)**
- Beschadigde matten
- Aantal = 0 (verwijderen?)
- TMS data kwaliteit (ligplaats)
- Logomatten ouder dan 4 jaar (met lage score)
- Logomatten ouder dan 3 jaar (vernieuwing plannen)
- Wissers verwijderen
- Toebehoren vervangen
- Contactpersonen wijzigingen
- Opmerkingen

**→ Belangrijk maar niet urgent**

---

### **🟢 Info (Nice to Have)**
- Upsell kansen (hoog wisser verbruik)

**→ Commerciële kansen, geen probleem**

---

## 📊 Voorbeeld Volledige Inspectie

**Klant:** Multihuur BV  
**Inspecteur:** Angelo  
**Datum:** 13-11-2024

### **Service TODO's (4):**
```
🔴 Controleer waarom mat 'Effekt mat 90x150' (Kantine) niet aanwezig is.
🔴 Mat 'Effekt mat 60x85' (Entree) vervangen of reinigen (sterk vervuild).
🟡 Mat 'Logomat Custom' (Receptie) inspecteren op schade.
💰 Upsell kans: Microvezeldoek Blauw heeft hoog verbruik (85% vuil). Overweeg extra wissers aan te bieden.
```

### **Klantenservice TODO's (3):**
```
📞 Logomat ouder dan 3 jaar bij klant 'Custom Logo 90x150': plan nieuwe logomat, check of logo gelijk is gebleven, geef aan dat je een nieuwe gaat bestellen.
🌐 Uitnodigen klantportaal voor julian.vervoort@klant.nl
👋 Contactpersoon Henk van Dam (henk@klant.nl) is niet meer in dienst. Controleer en update CRM.
```

### **Status:**
- **Totaal issues:** 7
- **Kritieke issues:** 2
- **Status:** ⚠️ Attentie nodig

---

## 🔍 Wat Triggert GEEN TODO?

### **Normale Situaties:**
- ✅ Mat aanwezig, schoon, onbeschadigd → **Geen TODO**
- ✅ Wisser voorraad normaal (<70% vuil) → **Geen TODO**
- ✅ Logomat jonger dan 3 jaar → **Geen TODO**
- ✅ Contactpersoon met email en routecontact → **Geen TODO**
- ✅ Toebehoren niet vervangen → **Geen TODO**

**Principe:** *"Geen nieuws is goed nieuws"*

---

## 📋 Checklist Voor Servicemedewerker

**Voor vertrek:**
- [ ] Check TODO's van vorige inspectie
- [ ] Materialen meegenomen (nieuwe matten, wissers)

**Tijdens inspectie:**
- [ ] Alle matten checken (aanwezig, conditie, barcode)
- [ ] Alle wissers tellen (aantal, vuil%)
- [ ] Toebehoren controleren
- [ ] Contactpersonen valideren
- [ ] Opmerkingen noteren

**Na inspectie:**
- [ ] TODO's bekijken
- [ ] Kritieke issues direct melden
- [ ] Volgende bezoek plannen (indien nodig)

---

## 🎯 Samenvatting Statistieken

**Totaal mogelijk aantal checks:** 15+

**Verdeeld over:**
- 👷 Service TODO's: 10 types
- 👥 Klantenservice TODO's: 5 types

**Per categorie:**
- 🎨 Matten: 5 checks
- 🧹 Wissers: 3 checks
- 🧰 Toebehoren: 2 checks
- 👤 Contactpersonen: 4 checks
- 💰 Upsell: 1 check

---

**Resultaat:** Een compleet beeld van de klant situatie met geautomatiseerde follow-up! 🚀

