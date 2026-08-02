import { ApiError } from '../utils/ApiError.js';
import { hasFeature, canWrite } from '../services/entitlements.service.js';

/**
 * Gate a route behind a feature the user's entitlements must include. Owners
 * always pass; members pass only if the owner granted them this feature. Must
 * run after requireAuth (needs req.user).
 */
export const requireFeature = (key) => (req, _res, next) => {
  if (hasFeature(req.user, key)) return next();
  next(
    ApiError.forbidden(
      "This feature isn't part of your workspace access. Ask your workspace owner to grant it.",
    ),
  );
};

/** Block view-only members (viewers) from write actions. Owners/editors pass. */
export const requireEditor = (req, _res, next) => {
  if (canWrite(req.user)) return next();
  next(ApiError.forbidden('You have view-only access in this workspace.'));
};
