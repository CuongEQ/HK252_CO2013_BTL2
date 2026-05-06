const express = require('express');
const adminController = require('../controllers/admin.controller');
const requireAdmin = require('../middlewares/requireAdmin');

const router = express.Router();

router.use(requireAdmin);
router.get('/schema/tables', adminController.getTables);
router.get('/schema/tables/:tableName/columns', adminController.getTableColumns);
router.get('/schema/tables/:tableName/rows', adminController.getTableRows);
router.get('/schema/procedures', adminController.getProcedures);
router.get('/schema/functions', adminController.getFunctions);
router.get('/schema/triggers', adminController.getTriggers);

module.exports = router;
