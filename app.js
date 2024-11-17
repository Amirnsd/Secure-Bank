const express = require('express');
const app = express();
const path = require('path');

const PersonalInfoRoute = require('./routes/routes');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, "views"));

app.use(express.static('public'));

app.use('/', PersonalInfoRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});