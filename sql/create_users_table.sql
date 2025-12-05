-- Tabel voor gebruikers authenticatie
-- Wachtwoorden worden GEHASHED opgeslagen (niet plain text!)

CREATE TABLE dbo.AppGebruikers (
    GebruikerID INT IDENTITY(1,1) PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    WachtwoordHash NVARCHAR(255) NOT NULL,  -- Gehashte wachtwoord
    Naam NVARCHAR(100) NOT NULL,
    Rol NVARCHAR(50) NOT NULL DEFAULT 'Servicemedewerker',
    Initialen NVARCHAR(5),
    KorteNaam NVARCHAR(50),
    Actief BIT NOT NULL DEFAULT 1,
    LaatsteLogin DATETIME2,
    AantalLoginPogingen INT DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Index voor snelle email lookup
CREATE INDEX IX_AppGebruikers_Email ON dbo.AppGebruikers(Email);

-- Voeg de huidige gebruikers toe met gehashte wachtwoorden
-- BELANGRIJK: Vervang deze hashes door echte bcrypt hashes!
-- Deze zijn tijdelijke placeholders

INSERT INTO dbo.AppGebruikers (Email, WachtwoordHash, Naam, Rol, Initialen, KorteNaam)
VALUES 
    ('michiel.heerkens@lavans.nl', 'HASH_HIER_INVULLEN', 'Michiel Heerkens', 'Service Manager', 'MH', 'Michiel'),
    ('tijn.heerkens@lavans.nl', 'HASH_HIER_INVULLEN', 'Tijn Heerkens', 'Servicemedewerker', 'TH', 'Tijn'),
    ('roberto.hendrikse@lavans.nl', 'HASH_HIER_INVULLEN', 'Roberto Hendrikse', 'Servicemedewerker', 'RH', 'Roberto');

-- Om een wachtwoord hash te genereren, gebruik deze query in combinatie met de API:
-- De API zal bcrypt gebruiken voor veilige hashing

