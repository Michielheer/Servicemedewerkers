# Lavans Service App

Een Streamlit-applicatie voor servicemedewerkers om inspecties voor matten en wissers te registreren.

## Functionaliteiten

- Inspectieformulier voor matten en wissers
- Contactpersoon beheer
- To-do lijst voor servicemedewerkers
- Management rapportage
- Automatische logging van wijzigingen
- PDF rapport generatie

## Installatie

1. Clone de repository:
```bash
git clone [repository-url]
```

2. Installeer de benodigde packages:
```bash
pip install -r requirements.txt
```

3. Maak een `.env` bestand aan met de volgende variabelen:
```
SUPABASE_URL=jouw_supabase_url
SUPABASE_KEY=jouw_supabase_key
```

## Gebruik

Start de applicatie met:
```bash
streamlit run app.py
```

## Dependencies

- streamlit
- pandas
- supabase
- python-dotenv
- fpdf
- openai

## Licentie

Dit project is eigendom van Lavans

```python
import login

login.require_login()
# ... rest van je app ... 