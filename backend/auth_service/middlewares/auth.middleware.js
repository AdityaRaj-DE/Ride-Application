const userModel = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const blackListTokenModel = require('../models/blacklistToken');
const captainModel = require('../models/driverModel');


module.exports.authUser = async (req, res, next) => {
    // Try to get token from cookie or Authorization header
    let token = null;
    
    if (req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        } else {
          token = authHeader;
        }
      }

    if (!token) {
        console.error('❌ [Auth User] No token provided for', req.method, req.path);
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    console.log('🔐 [Auth User] Token received, length:', token.length);


    const isBlacklisted = await blackListTokenModel.findOne({ token: token });

    if (isBlacklisted) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'goodkeymustchange');
        console.log('✅ [Auth User] Token decoded successfully, payload:', { id: decoded.id, email: decoded.email });
        
        const userId = decoded.id || decoded._id;
        
        if (!userId) {
            console.error('❌ [Auth User] No user ID in token:', decoded);
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }

        const user = await userModel.findById(userId);

        if (!user) {
            console.error('❌ [Auth User] User not found for ID:', userId);
            return res.status(401).json({ message: 'Unauthorized: User not found' });
        }

        console.log('✅ [Auth User] User found:', user.email);
        req.user = user;
        return next();

    } catch (err) {
        console.error('❌ [Auth] JWT verification error:', err.message);
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Unauthorized: Token expired' });
        }
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports.authCaptain = async (req, res, next) => {
    // Try to get token from cookie or Authorization header
    let token = req.cookies.token;
    
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else {
            token = authHeader;
        }
    }

    if (!token) {
        console.error('❌ [Auth Captain] No token provided for', req.method, req.path);
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    console.log('🔐 [Auth Captain] Token received, length:', token.length);

    const isBlacklisted = await blackListTokenModel.findOne({ token: token });



    if (isBlacklisted) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'goodkeymustchange');
        console.log('✅ [Auth Captain] Token decoded successfully, payload:', { id: decoded.id });
        
        const captainId = decoded.id || decoded._id;
        
        if (!captainId) {
            console.error('❌ [Auth Captain] No captain ID in token:', decoded);
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }

        const captain = await captainModel.findById(captainId);

        if (!captain) {
            console.error('❌ [Auth Captain] Captain not found for ID:', captainId);
            return res.status(401).json({ message: 'Unauthorized: Driver not found' });
        }

        console.log('✅ [Auth Captain] Captain found:', captain.email);
        req.captain = captain;
        return next();
    } catch (err) {
        console.error('❌ [Auth] JWT verification error:', err.message);
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Unauthorized: Token expired' });
        }
        return res.status(401).json({ message: 'Unauthorized' });
    }
}