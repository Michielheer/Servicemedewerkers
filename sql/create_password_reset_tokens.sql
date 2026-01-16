-- ============================================
-- Tabel voor wachtwoord reset tokens
-- ============================================

IF OBJECT_ID('dbo.WachtwoordResetTokens', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.WachtwoordResetTokens (
        TokenID INT IDENTITY(1,1) PRIMARY KEY,
        GebruikerID INT NOT NULL,
        Token NVARCHAR(100) NOT NULL UNIQUE,
        Email NVARCHAR(255) NOT NULL,  -- Email waar reset link naartoe is gestuurd
        GeldigTot DATETIME2 NOT NULL,   -- Token verloopt na 1 uur
        Gebruikt BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (GebruikerID) REFERENCES dbo.AppGebruikers(GebruikerID)
    );
    
    CREATE INDEX IX_WachtwoordResetTokens_Token ON dbo.WachtwoordResetTokens(Token);
    CREATE INDEX IX_WachtwoordResetTokens_GebruikerID ON dbo.WachtwoordResetTokens(GebruikerID);
    
    PRINT 'Tabel WachtwoordResetTokens aangemaakt';
END
GO

-- Voeg Email kolom toe aan AppGebruikers als die nog niet bestaat
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.AppGebruikers') AND name = 'Email')
BEGIN
    ALTER TABLE dbo.AppGebruikers ADD Email NVARCHAR(255);
    PRINT 'Email kolom toegevoegd aan AppGebruikers';
END
GO

