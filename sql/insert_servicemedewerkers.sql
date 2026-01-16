-- ============================================
-- Servicemedewerkers toevoegen aan AppGebruikers
-- ============================================

-- Stap 1: Maak de tabel aan als die nog niet bestaat
IF OBJECT_ID('dbo.AppGebruikers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AppGebruikers (
        GebruikerID INT IDENTITY(1,1) PRIMARY KEY,
        Gebruikersnaam NVARCHAR(20) NOT NULL UNIQUE,  -- Bijv. AOOR, ASTR
        WachtwoordHash NVARCHAR(255) NOT NULL,
        Naam NVARCHAR(100) NOT NULL,
        Email NVARCHAR(255),  -- Voor wachtwoord reset
        Rol NVARCHAR(100) NOT NULL DEFAULT 'ServiceMedewerker',
        Actief BIT NOT NULL DEFAULT 1,
        LaatsteLogin DATETIME2,
        AantalLoginPogingen INT DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    
    CREATE INDEX IX_AppGebruikers_Gebruikersnaam ON dbo.AppGebruikers(Gebruikersnaam);
    PRINT 'Tabel AppGebruikers aangemaakt';
END
ELSE
BEGIN
    -- Voeg Gebruikersnaam kolom toe als die niet bestaat
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.AppGebruikers') AND name = 'Gebruikersnaam')
    BEGIN
        ALTER TABLE dbo.AppGebruikers ADD Gebruikersnaam NVARCHAR(20);
        PRINT 'Kolom Gebruikersnaam toegevoegd';
    END
    
    -- Voeg Email kolom toe als die niet bestaat
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.AppGebruikers') AND name = 'Email')
    BEGIN
        ALTER TABLE dbo.AppGebruikers ADD Email NVARCHAR(255);
        PRINT 'Kolom Email toegevoegd';
    END
END
GO

-- Stap 1b: Maak WachtwoordResetTokens tabel aan
IF OBJECT_ID('dbo.WachtwoordResetTokens', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.WachtwoordResetTokens (
        TokenID INT IDENTITY(1,1) PRIMARY KEY,
        GebruikerID INT NOT NULL,
        Token NVARCHAR(100) NOT NULL UNIQUE,
        Email NVARCHAR(255) NOT NULL,
        GeldigTot DATETIME2 NOT NULL,
        Gebruikt BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    
    CREATE INDEX IX_WachtwoordResetTokens_Token ON dbo.WachtwoordResetTokens(Token);
    PRINT 'Tabel WachtwoordResetTokens aangemaakt';
END
GO

-- Stap 2: Voeg alle servicemedewerkers toe
-- Standaard wachtwoord: Lavans2025! (hash hieronder gegenereerd met bcrypt cost 10)
-- BELANGRIJK: Laat medewerkers hun wachtwoord wijzigen na eerste login!

DECLARE @StandaardHash NVARCHAR(255) = '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjqQBrkHx3ShpMxqS6cNpBEKp3L7G2'; -- Hash van 'Lavans2025!'

-- Verwijder bestaande data (optioneel - commentaar verwijderen als gewenst)
-- DELETE FROM dbo.AppGebruikers;

-- Insert alle medewerkers
INSERT INTO dbo.AppGebruikers (Gebruikersnaam, WachtwoordHash, Naam, Rol, Actief)
SELECT v.Gebruikersnaam, @StandaardHash, v.Naam, v.Rol, v.Actief
FROM (VALUES
    ('AOOR', 'Aaron van Oorschot', 'ServiceMedewerker', 1),
    ('ASTR', 'Ad Strijbosch', 'ServiceMedewerker,ServiceCoordinator', 1),
    ('ACAM', 'Alejandro da Silva Campuzano', 'ServiceMedewerker', 1),
    ('AWEE', 'Alexander Weerts', 'ServiceMedewerker', 1),
    ('ALAA', 'André van de Laan', 'ServiceMedewerker', 1),
    ('AJUR', 'Annalinde Jurriaans', 'ServiceMedewerker,Binnendienst,ServiceCoordinator', 1),
    ('AVER', 'Antonie Verhees', 'ServiceMedewerker,ServiceCoordinator,RegioTeamleider', 1),
    ('AENG', 'Arjan van Engelen', 'ServiceMedewerker,ServiceCoordinator,RegioTeamleider', 1),
    ('AME2', 'Arno Meeuwsen', 'ServiceMedewerker,Binnendienst', 1),
    ('AVE3', 'Arthur Verhofstadt', 'ServiceMedewerker', 1),
    ('BSTE', 'Bryan Sterken', 'ServiceMedewerker', 1),
    ('CHEY', 'Chris van der Heyde', 'ServiceMedewerker,Binnendienst', 1),
    ('DTIJ', 'Dave Tijsma', 'ServiceMedewerker,Binnendienst', 1),
    ('DKLE', 'Dennis Kleverlaan', 'ServiceMedewerker', 1),
    ('DVLU', 'Dennis Vlug', 'ServiceMedewerker', 1),
    ('DVER', 'Dirk Verwey', 'ServiceMedewerker,ServiceCoordinator', 1),
    ('DBOM', 'Djim van Bommel', 'ServiceMedewerker', 1),
    ('ECOE', 'Edilson Coelho', 'ServiceMedewerker', 1),
    ('FAHM', 'Faouzi Ahmidan', 'ServiceMedewerker,ServiceCoordinator', 1),
    ('GSTR', 'Gerald Strijker', 'ServiceMedewerker,ServiceCoordinator', 1),
    ('GSLI', 'Gert-Jan Slits', 'ServiceMedewerker,Binnendienst', 1),
    ('GMEN', 'Guno Menzo', 'ServiceMedewerker', 1),
    ('HEI2', 'Hans van Eijk', 'ServiceMedewerker', 1),
    ('HWEI', 'Harold van der Weide', 'ServiceMedewerker', 1),
    ('HGIE', 'Harry Gieskes', 'ServiceMedewerker', 1),
    ('HDAM', 'Has Damen', 'ServiceMedewerker', 1),
    ('HJON', 'Hilde Jongejans', 'ServiceMedewerker,ServiceCoordinator', 1),
    ('HVRI', 'Homme de Vries', 'ServiceMedewerker,Binnendienst,ServiceCoordinator', 1),
    ('JHEN1', 'Jimmy Hendrikse', 'ServiceMedewerker,ServiceCoordinator,RegioTeamleider', 1),
    ('JRO2', 'John Roordink', 'ServiceMedewerker', 1),
    ('KHAM', 'Kelvin van Ham', 'ServiceMedewerker', 1),
    ('KBAR', 'Kevin Barendsen', 'ServiceMedewerker', 1),
    ('KHUI', 'Klaas Huising', 'ServiceMedewerker,ServiceCoordinator', 1),
    ('KMEE', 'Koen van Meerwijk', 'ServiceMedewerker,Binnendienst,AccountManager', 1),
    ('LRIE', 'Lieuwe Rietveld', 'ServiceMedewerker', 1),
    ('Logistiek', 'Logistiek', 'ServiceMedewerker', 1),
    ('MVER', 'Maarten Verhees', 'ServiceMedewerker', 1),
    ('MFIL', 'Maikel Filippini', 'ServiceMedewerker,Binnendienst', 1),
    ('MHEU', 'Mariella Dommelen - van den Heuvel', 'ServiceMedewerker,Binnendienst', 1),
    ('MTEE', 'Mark Teekens', 'ServiceMedewerker', 1),
    ('MHO2', 'Mark van Hout', 'ServiceMedewerker,Binnendienst', 1),
    ('MWOU', 'Mathijs Wouters', 'ServiceMedewerker', 1),
    ('MLIN', 'Menno Lindhout', 'ServiceMedewerker', 1),
    ('MZWA', 'Michael de Zwart', 'ServiceMedewerker,ServiceCoordinator', 1),
    ('MLOE', 'Michel van Loenen', 'ServiceMedewerker,ServiceCoordinator,RegioTeamleider', 1),
    ('MDOR', 'Mike Dörenberg', 'ServiceMedewerker', 1),
    ('MHEII', 'Miranda Heijthuijzen', 'ServiceMedewerker', 1),
    ('MRIJ', 'Mirjam van Rijt', 'ServiceMedewerker,ServiceCoordinator', 1),
    ('MBRO', 'Mischa Broeders', 'ServiceMedewerker,Binnendienst,ServiceCoordinator,RegioTeamleider', 1),
    ('NSNI', 'Nick Snijders', 'ServiceMedewerker', 1),
    ('NHEN', 'Nicky Hendrix', 'ServiceMedewerker', 1),
    ('NBAG', 'Niels Baggermans', 'ServiceMedewerker', 1),
    ('GEEN', 'Niemand beschikbaar', 'ServiceMedewerker', 1),
    ('PBOL', 'Patrick Bolders', 'ServiceMedewerker,ServiceCoordinator', 1),
    ('PDAS', 'Patrick Dashorst', 'ServiceMedewerker,AccountManager,ServiceCoordinator,RegioTeamleider', 1),
    ('PKOR', 'Patrick Korteweg', 'ServiceMedewerker', 1),
    ('PJIL', 'Perry Jilisen', 'ServiceMedewerker', 1),
    ('POPM', 'Peter Opmeer', 'ServiceMedewerker', 1),
    ('PBRU', 'Petra van Brummelen', 'ServiceMedewerker', 1),
    ('PZIM', 'Piet Zimmerman', 'ServiceMedewerker', 1),
    ('RARN', 'René Arnoldus', 'ServiceMedewerker,ServiceCoordinator', 1),
    ('RSEB', 'Ria Sebregts', 'ServiceMedewerker', 1),
    ('RKOO', 'Rik Koops', 'ServiceMedewerker,Binnendienst,ServiceCoordinator', 1),
    ('RHEN', 'Roberto Hendrikse', 'ServiceMedewerker', 1),
    ('RBIL', 'Rob van de Bilt', 'ServiceMedewerker', 1),
    ('REI2', 'Roel Eijsbouts', 'ServiceMedewerker', 1),
    ('SBOU2', 'Sander Bouïus', 'ServiceMedewerker,ServiceCoordinator', 1),
    ('SPLA', 'Shendrik Plantijn', 'ServiceMedewerker', 1),
    ('SNIJ', 'Simone Nijman', 'ServiceMedewerker,ServiceCoordinator', 1),
    ('SVEE', 'Stephan van Veenendaal', 'ServiceMedewerker', 1),
    ('TCRO', 'Tim van den Crommenacker', 'ServiceMedewerker', 1),
    ('VHAL', 'Vyncent Hall', 'ServiceMedewerker', 1),
    ('WMOL', 'Willem Van der Molen', 'ServiceMedewerker', 1),
    ('YBEN', 'Youssef Benali', 'ServiceMedewerker', 1),
    ('YBEL', 'Yunus Belketin', 'ServiceMedewerker', 1)
) AS v(Gebruikersnaam, Naam, Rol, Actief)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.AppGebruikers g WHERE g.Gebruikersnaam = v.Gebruikersnaam
);

-- Toon resultaat
SELECT COUNT(*) AS 'Aantal gebruikers toegevoegd' FROM dbo.AppGebruikers;
SELECT Gebruikersnaam, Naam, Rol, Actief FROM dbo.AppGebruikers ORDER BY Naam;

