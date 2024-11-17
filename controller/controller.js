const { connectDB } = require('../db/config');
const sql = require('mssql');

const homePage = (req, res) => {
    res.render('index');
};

async function chequingAccount(req, res) {
    try {
        const pool = await connectDB();
        const results = await pool.request().query('SELECT * FROM ChequingAccount');
        res.render('chequingInfo', { data: results.recordset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function savingAccount(req, res) {
    try {
        const pool = await connectDB();
        const results = await pool.request().query('SELECT * FROM SavingsAccount');
        res.render('savingInfo', { data: results.recordset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getPersonalInformation(req, res) {
    try {
        const pool = await connectDB();
        const result = await pool.request().query('SELECT * FROM PersonalInformation');
        res.render('customerInfo', { data: result.recordset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function createCustomer(req, res) {
    try {
        const pool = await connectDB();
        const {
            name, phoneNumber, streetName, city,
            province, postalcode, email,
            chequingBalance, savingsBalance
        } = req.body;

        if (!name) return res.status(400).json({ error: 'Name is required' });

        const initialChequingBalance = parseFloat(chequingBalance || 0);
        const initialSavingsBalance = parseFloat(savingsBalance || 0);

        if (initialChequingBalance < 0 || initialSavingsBalance < 0) {
            return res.status(400).json({ error: 'Balances cannot be negative' });
        }

        const dateCreated = new Date().toISOString();

        const personalInfoResult = await pool.request()
            .input('name', sql.VarChar, name)
            .input('phoneNumber', sql.VarChar, phoneNumber)
            .input('streetName', sql.VarChar, streetName)
            .input('city', sql.VarChar, city)
            .input('province', sql.VarChar, province)
            .input('postalcode', sql.VarChar, postalcode)
            .input('email', sql.VarChar, email)
            .input('dateCreated', sql.Date, dateCreated)
            .query(`
                INSERT INTO PersonalInformation 
                (Name, PhoneNumber, StreetName, City, Province, Postalcode, Email, DateCreated)
                OUTPUT INSERTED.AccountNumber
                VALUES (@name, @phoneNumber, @streetName, @city, @province, @postalcode, @email, @dateCreated)
            `);

        const newAccountNumber = personalInfoResult.recordset[0].AccountNumber;

        await pool.request()
            .input('accountNumber', sql.Int, newAccountNumber)
            .input('balance', sql.Decimal(12, 3), initialChequingBalance)
            .query('INSERT INTO ChequingAccount (AccountNumber, Balance) VALUES (@accountNumber, @balance)');

        await pool.request()
            .input('accountNumber', sql.Int, newAccountNumber)
            .input('balance', sql.Decimal(15, 3), initialSavingsBalance)
            .query('INSERT INTO SavingsAccount (AccountNumber, Balance) VALUES (@accountNumber, @balance)');

        res.redirect('/customerinfo');
    } catch (err) {
        console.log(`Error: ${err}`);
        res.status(500).json({ error: err.message });
    }
}

async function deleteCustomer(req, res) {
    const { accountNumber } = req.params;
    try {
        const pool = await connectDB();

        await pool.request()
            .input('accountNumber', sql.Int, accountNumber)
            .query('DELETE FROM ChequingAccount WHERE AccountNumber = @accountNumber');

        await pool.request()
            .input('accountNumber', sql.Int, accountNumber)
            .query('DELETE FROM SavingsAccount WHERE AccountNumber = @accountNumber');

        await pool.request()
            .input('accountNumber', sql.Int, accountNumber)
            .query('DELETE FROM PersonalInformation WHERE AccountNumber = @accountNumber');

        res.redirect('/customerinfo');
    } catch (err) {
        console.log(`Error deleting customer: ${err}`);
        res.status(500).json({ error: err.message });
    }
}

async function updateCustomer(req, res) {
    try {
        const accountNumber = req.params.accountNumber;
        const {
            Name, PhoneNumber, StreetName, City,
            Province, Postalcode, Email,
            chequingBalance, savingsBalance
        } = req.body;

        if (!Name || !PhoneNumber || !StreetName || !City || !Province || !Postalcode || !Email) {
            return res.status(400).json({ error: 'All personal information fields are required' });
        }

        const newChequingBalance = parseFloat(chequingBalance || 0);
        const newSavingsBalance = parseFloat(savingsBalance || 0);

        if (isNaN(newChequingBalance) || newChequingBalance < 0 || isNaN(newSavingsBalance) || newSavingsBalance < 0) {
            return res.status(400).json({ error: 'Invalid account balances' });
        }

        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            await transaction.request()
                .input('accountNumber', sql.Int, accountNumber)
                .input('name', sql.VarChar, Name)
                .input('phoneNumber', sql.VarChar, PhoneNumber)
                .input('streetName', sql.VarChar, StreetName)
                .input('city', sql.VarChar, City)
                .input('province', sql.VarChar, Province)
                .input('postalcode', sql.VarChar, Postalcode)
                .input('email', sql.VarChar, Email)
                .query(`
                    UPDATE PersonalInformation
                    SET Name = @name, PhoneNumber = @phoneNumber, StreetName = @streetName,
                        City = @city, Province = @province, Postalcode = @postalcode, Email = @email
                    WHERE AccountNumber = @accountNumber
                `);

            await transaction.request()
                .input('accountNumber', sql.Int, accountNumber)
                .input('balance', sql.Decimal(12, 2), newChequingBalance)
                .query('UPDATE ChequingAccount SET Balance = @balance WHERE AccountNumber = @accountNumber');

            await transaction.request()
                .input('accountNumber', sql.Int, accountNumber)
                .input('balance', sql.Decimal(15, 2), newSavingsBalance)
                .query('UPDATE SavingsAccount SET Balance = @balance WHERE AccountNumber = @accountNumber');

            await transaction.commit();
            res.redirect('/customerinfo');
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.log(`Error updating customer: ${err}`);
        res.status(500).json({ error: err.message });
    }
}

async function getCustomerToUpdate(req, res) {
    try {
        const pool = await connectDB();
        const accountNumber = req.params.accountNumber;

        const personalInfoResult = await pool.request()
            .input('AccountNumber', sql.Int, accountNumber)
            .query('SELECT * FROM PersonalInformation WHERE AccountNumber = @AccountNumber');

        if (!personalInfoResult.recordset[0]) {
            return res.status(404).send('Customer not found.');
        }

        const chequingResult = await pool.request()
            .input('AccountNumber', sql.Int, accountNumber)
            .query('SELECT Balance FROM ChequingAccount WHERE AccountNumber = @AccountNumber');

        const savingsResult = await pool.request()
            .input('AccountNumber', sql.Int, accountNumber)
            .query('SELECT Balance FROM SavingsAccount WHERE AccountNumber = @AccountNumber');

        const customerData = {
            ...personalInfoResult.recordset[0],
            chequingBalance: Number(chequingResult.recordset[0]?.Balance || 0).toFixed(2),
            savingsBalance: Number(savingsResult.recordset[0]?.Balance || 0).toFixed(2),
        };

        res.render('updatecustomer', { person: customerData });
    } catch (err) {
        console.log(`Error retrieving customer: ${err}`);
        res.status(500).send({ error: err.message });
    }
}

module.exports = {
    homePage,
    getPersonalInformation,
    chequingAccount,
    savingAccount,
    createCustomer,
    deleteCustomer,
    getCustomerToUpdate,
    updateCustomer,
};
