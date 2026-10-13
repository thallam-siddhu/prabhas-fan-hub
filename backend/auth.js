const bcrypt = require("bcrypt");


// =========================================
// OWNER ACCOUNT
// =========================================

const OWNER_USERNAME = "owner";


// Password will be checked using bcrypt
const OWNER_PASSWORD_HASH =
    bcrypt.hashSync("ChangeThisPassword123!", 10);


// =========================================
// VERIFY OWNER LOGIN
// =========================================

async function verifyOwner(username, password) {

    if (username !== OWNER_USERNAME) {
        return false;
    }

    return await bcrypt.compare(
        password,
        OWNER_PASSWORD_HASH
    );
}


module.exports = {
    verifyOwner
};