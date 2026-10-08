const express = require("express");
const cors = require("cors");
const { graphqlHTTP } = require("express-graphql");

const schema = require("./schema");
const resolvers = require("./resolver");

const app = express();


// =========================
// CORS
// =========================
app.use(cors());


// =========================
// GRAPHQL
// =========================
app.use(
    "/graphql",
    graphqlHTTP({
        schema: schema,
        rootValue: resolvers,
        graphiql: true
    })
);


// =========================
// TEST ROUTE
// =========================
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "MIS Dashboard Backend is running"
    });
});


// =========================
// START SERVER
// =========================
const PORT = 4000;

app.listen(PORT, () => {
    console.log(`🚀 MIS Backend running on http://localhost:${PORT}`);
    console.log(`📊 GraphQL running on http://localhost:${PORT}/graphql`);
    require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { graphqlHTTP } = require("express-graphql");

const schema = require("./schema");
const resolvers = require("./resolver");
const { importWorkbook } = require("./import-excel");

const app = express();

const PORT = Number(process.env.PORT || 4000);

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ========================================
// EXCEL UPLOAD CONFIGURATION
// ========================================

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    dest: uploadDir,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20 MB
    },
    fileFilter: (req, file, cb) => {

        const allowedExtensions = [".xlsx", ".xls"];

        const extension = path.extname(file.originalname).toLowerCase();

        if (!allowedExtensions.includes(extension)) {
            return cb(
                new Error("Only Excel files (.xlsx or .xls) are allowed.")
            );
        }

        cb(null, true);
    }
});


// ========================================
// GRAPHQL API
// ========================================

app.use(
    "/graphql",
    graphqlHTTP({
        schema: schema,
        rootValue: resolvers,
        graphiql: true
    })
);


// ========================================
// EXCEL IMPORT API
// ========================================

app.post(
    "/api/import-excel",
    upload.single("file"),
    async (req, res) => {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "Excel file is required."
            });
        }

        try {

            console.log(
                `📥 Excel upload received: ${req.file.originalname}`
            );

            const result = await importWorkbook(req.file.path);

            console.log(
                `✅ Excel import completed. Imported: ${result.imported}, Skipped: ${result.skipped}`
            );

            return res.json({
                success: true,
                file: req.file.originalname,
                imported: result.imported,
                skipped: result.skipped,
                errors: result.errors || []
            });

        } catch (error) {

            console.error("❌ Excel import error:", error);

            return res.status(500).json({
                success: false,
                error: error.message
            });

        } finally {

            // Delete temporary uploaded Excel file
            fs.unlink(req.file.path, (err) => {

                if (err) {
                    console.warn(
                        "⚠️ Could not delete temporary Excel file:",
                        err.message
                    );
                }

            });

        }
    }
);


// ========================================
// HEALTH CHECK
// ========================================

app.get("/", (req, res) => {

    res.json({
        status: "success",
        message: "MIS Dashboard Backend is running",
        graphql: `http://localhost:${PORT}/graphql`,
        excelImport: `http://localhost:${PORT}/api/import-excel`
    });

});


// ========================================
// 404 HANDLER
// ========================================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        error: "Route not found"
    });

});


// ========================================
// ERROR HANDLER
// ========================================

app.use((err, req, res, next) => {

    console.error("❌ Server error:", err);

    res.status(500).json({
        success: false,
        error: err.message || "Internal server error"
    });

});


// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {

    console.log("");
    console.log("========================================");
    console.log("🚀 MIS DASHBOARD BACKEND");
    console.log("========================================");
    console.log(`Server     : http://localhost:${PORT}`);
    console.log(`GraphQL    : http://localhost:${PORT}/graphql`);
    console.log(`Excel API  : http://localhost:${PORT}/api/import-excel`);
    console.log("========================================");
    console.log("");

});
});
