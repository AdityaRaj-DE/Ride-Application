const driverModel = require('../models/driverModel');


module.exports.createCaptain = async ({
    firstname, lastname, email, mobileNumber, password,licenseNumber, color, plate, capacity, vehicleType
}) => {
    if (!firstname || !email || !password || !mobileNumber || !licenseNumber || !color || !plate || !capacity || !vehicleType) {
        throw new Error('All fields are required');
    }
    const captain = driverModel.create({
        fullname: {
            firstname,
            lastname
        },
        email,
        password,
        mobileNumber,
        licenseNumber,
        vehicle: {
            color,
            plate,
            capacity,
            vehicleType
        }
    })

    return captain;
}