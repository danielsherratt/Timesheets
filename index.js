// src/index.js
import { Router } from '@cloudflare/workers-router';
import { register, login, me }      from './api/auth.js';
import { startWeek, addEntry, getWeek, submitWeek, listWeeks }
                                      from './api/timesheet.js';
import { listAll, reopen }           from './api/admin.js';

const router = new Router();

// Auth
router.post('/api/auth/register', register);
router.post('/api/auth/login',    login);
router.get( '/api/auth/me',       me);
// backward compatibility with old endpoints
router.post('/api/register', register);
router.post('/api/login',    login);

// Timesheet
router.post('/api/timesheet/:week/start',   startWeek);
router.post('/api/timesheet/:week/entries', addEntry);
router.get( '/api/timesheet/:week',         getWeek);
router.post('/api/timesheet/:week/submit',  submitWeek);
router.get( '/api/timesheets',              listWeeks);

// Admin
router.get( '/api/admin/timesheets',           listAll);
router.post('/api/admin/timesheet/:id/reopen', reopen);

export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  },
};
