import { RequestHandler } from 'express';
import { UserAccessLevel } from '../types';

export const isAuthenticated: RequestHandler = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
};

export const hasRole = (roles: UserAccessLevel[] | UserAccessLevel): RequestHandler => {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    return (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }
        
        const userRole = req.session.user.role;
        if (requiredRoles.includes(userRole)) {
            return next();
        }
        
        return res.status(403).json({ message: 'Forbidden. You do not have the required permissions.' });
    };
};