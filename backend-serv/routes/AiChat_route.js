const express  = require("express");

const router  = express.Router();

const aichat_controller = require("../controllers/aichat_controller/aichat_controller");

const multer = require("multer");

// Upload in RAM (niente file su disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {}, //fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    //if (!/\.csv$/i.test(file.originalname)) return cb(new Error("Solo file .csv"));
    cb(null, true);
  },
});
router.post("/upload",upload.single("file"),aichat_controller.sendCsvSummary);
router.post("/",aichat_controller.sendMessage);
router.get("/csvsummary", aichat_controller.sendCsvSummary);


module.exports = router;