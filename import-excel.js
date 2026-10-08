const XLSX = require("xlsx");
const pool = require("./db");


// ========================================
// HEADER CLEANER
// ========================================

function cleanHeader(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[()]/g, "")
        .replace(/[\s\-\/]+/g, "_");

}


// ========================================
// FIND VALUE FROM MULTIPLE POSSIBLE HEADERS
// ========================================

function first(row, aliases) {

    for (const alias of aliases) {

        const key = cleanHeader(alias);

        if (
            Object.prototype.hasOwnProperty.call(row, key) &&
            row[key] !== null &&
            row[key] !== ""
        ) {

            return row[key];

        }

    }

    return null;

}


// ========================================
// NUMBER CONVERSION
// ========================================

function number(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }


    const n =
        Number(
            String(value)
                .replace(/,/g, "")
                .trim()
        );


    return Number.isFinite(n) ? n : 0;

}


// ========================================
// EXCEL DATE → MYSQL DATE
// ========================================

function excelDate(value) {

    if (value instanceof Date) {

        const year =
            value.getFullYear();

        const month =
            String(
                value.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                value.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;

    }


    if (typeof value === "number") {

        const parsed =
            XLSX.SSF.parse_date_code(
                value
            );


        if (!parsed) {
            return null;
        }


        return (
            `${parsed.y}-` +
            `${String(parsed.m).padStart(2, "0")}-` +
            `${String(parsed.d).padStart(2, "0")}`
        );

    }


    const text =
        String(value ?? "").trim();


    if (!text) {
        return null;
    }


    // YYYY-MM-DD

    if (
        /^\d{4}-\d{1,2}-\d{1,2}$/.test(text)
    ) {

        const parts =
            text.split("-");

        return (
            `${parts[0]}-` +
            `${parts[1].padStart(2, "0")}-` +
            `${parts[2].padStart(2, "0")}`
        );

    }


    // DD/MM/YYYY or DD-MM-YYYY

    const match =
        text.match(
            /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/
        );


    if (match) {

        const day =
            match[1].padStart(2, "0");

        const month =
            match[2].padStart(2, "0");

        let year =
            match[3];

        if (year.length === 2) {
            year = `20${year}`;
        }


        return `${year}-${month}-${day}`;

    }


    const parsedDate =
        new Date(text);


    if (!Number.isNaN(parsedDate.getTime())) {

        return (
            `${parsedDate.getFullYear()}-` +
            `${String(
                parsedDate.getMonth() + 1
            ).padStart(2, "0")}-` +
            `${String(
                parsedDate.getDate()
            ).padStart(2, "0")}`
        );

    }


    return null;

}


// ========================================
// EXCEL TIME → MYSQL TIME
// ========================================

function excelTime(value) {

    if (value instanceof Date) {

        return (
            `${String(
                value.getHours()
            ).padStart(2, "0")}:` +

            `${String(
                value.getMinutes()
            ).padStart(2, "0")}:` +

            `${String(
                value.getSeconds()
            ).padStart(2, "0")}`
        );

    }


    if (typeof value === "number") {

        const totalSeconds =
            Math.round(
                value * 24 * 60 * 60
            );


        const hours =
            Math.floor(
                totalSeconds / 3600
            ) % 24;


        const minutes =
            Math.floor(
                (totalSeconds % 3600) / 60
            );


        const seconds =
            totalSeconds % 60;


        return (
            `${String(hours).padStart(2, "0")}:` +
            `${String(minutes).padStart(2, "0")}:` +
            `${String(seconds).padStart(2, "0")}`
        );

    }


    const text =
        String(value ?? "").trim();


    if (!text) {
        return "00:00:00";
    }


    // HH:MM

    if (
        /^\d{1,2}:\d{2}$/.test(text)
    ) {

        return `${text}:00`;

    }


    return text;

}


// ========================================
// CALCULATE ACTUAL CONSUMPTION
// ========================================

function actualConsumption(
    current,
    previous
) {

    if (
        previous === null ||
        previous === undefined
    ) {

        return 0;

    }


    const difference =
        number(current) -
        number(previous);


    if (difference <= 0) {
        return 0;
    }


    /*
       Existing MIS calculation logic:
       Difference × 120
    */

    return difference * 120;

}


// ========================================
// IMPORT EXCEL WORKBOOK
// ========================================

async function importWorkbook(filePath) {

    const workbook =
        XLSX.readFile(
            filePath,
            {
                cellDates: true
            }
        );


    let imported = 0;

    let skipped = 0;

    const errors = [];


    // ====================================
    // PROCESS EVERY SHEET
    // ====================================

    for (
        const sheetName of workbook.SheetNames
    ) {

        const sheet =
            workbook.Sheets[sheetName];


        const rawRows =
            XLSX.utils.sheet_to_json(
                sheet,
                {
                    defval: null
                }
            );


        // Normalize Excel headers

        const rows =
            rawRows.map(row => {

                return Object.fromEntries(

                    Object.entries(row).map(
                        ([key, value]) => [

                            cleanHeader(key),

                            value

                        ]
                    )

                );

            });


        console.log(
            `📄 Processing sheet: ${sheetName}`
        );

        console.log(
            `   Rows found: ${rows.length}`
        );


        // =================================
        // PROCESS EACH ROW
        // =================================

        for (
            let index = 0;
            index < rows.length;
            index++
        ) {

            const row =
                rows[index];


            try {

                // -------------------------
                // DATE
                // -------------------------

                const date =
                    excelDate(
                        first(
                            row,
                            [
                                "date",
                                "reading_date",
                                "reading date"
                            ]
                        )
                    );


                // -------------------------
                // TIME
                // -------------------------

                const time =
                    excelTime(
                        first(
                            row,
                            [
                                "time",
                                "reading_time",
                                "reading time"
                            ]
                        )
                    );


                if (!date) {

                    skipped++;

                    errors.push(
                        `${sheetName} row ${index + 2}: invalid/missing date`
                    );

                    continue;

                }


                // =================================
                // MAIN METER VALUES
                // =================================

                const mainKwh =
                    number(
                        first(
                            row,
                            [
                                "main_kwh",
                                "main kwh",
                                "main_kwh_reading",
                                "main_meter_kwh"
                            ]
                        )
                    );


                const mainKvah =
                    number(
                        first(
                            row,
                            [
                                "main_kvah",
                                "main kvah",
                                "main_kvah_reading",
                                "main_meter_kvah"
                            ]
                        )
                    );


                const mainKvaMd =
                    number(
                        first(
                            row,
                            [
                                "main_kva_md",
                                "main kva md",
                                "main_kva",
                                "main_kva_md_reading"
                            ]
                        )
                    );


                const mainPfDisplay =
                    number(
                        first(
                            row,
                            [
                                "main_pf_display",
                                "main pf display"
                            ]
                        )
                    );


                const mainPf =
                    number(
                        first(
                            row,
                            [
                                "main_pf",
                                "main pf",
                                "main_power_factor"
                            ]
                        )
                    );


                // =================================
                // CHECK METER VALUES
                // =================================

                const checkKwh =
                    number(
                        first(
                            row,
                            [
                                "check_kwh",
                                "check kwh",
                                "check_kwh_reading",
                                "check_meter_kwh"
                            ]
                        )
                    );


                const checkKvah =
                    number(
                        first(
                            row,
                            [
                                "check_kvah",
                                "check kvah",
                                "check_kvah_reading",
                                "check_meter_kvah"
                            ]
                        )
                    );


                const checkKvaMd =
                    number(
                        first(
                            row,
                            [
                                "check_kva_md",
                                "check kva md",
                                "check_kva",
                                "check_kva_md_reading"
                            ]
                        )
                    );


                const checkPfDisplay =
                    number(
                        first(
                            row,
                            [
                                "check_pf_display",
                                "check pf display"
                            ]
                        )
                    );


                const checkPf =
                    number(
                        first(
                            row,
                            [
                                "check_pf",
                                "check pf",
                                "check_power_factor"
                            ]
                        )
                    );


                // =================================
                // CHECK DUPLICATE
                // =================================

                const [existing] =
                    await pool.query(
                        `
                        SELECT id
                        FROM meter_readings
                        WHERE
                            reading_date = ?
                            AND reading_time = ?
                        LIMIT 1
                        `,
                        [
                            date,
                            time
                        ]
                    );


                if (existing.length > 0) {

                    skipped++;

                    continue;

                }


                // =================================
                // PREVIOUS READING
                // =================================

                const [previousRows] =
                    await pool.query(
                        `
                        SELECT
                            main_kwh,
                            check_kwh
                        FROM meter_readings
                        WHERE
                            reading_date < ?
                            OR (
                                reading_date = ?
                                AND reading_time < ?
                            )
                        ORDER BY
                            reading_date DESC,
                            reading_time DESC,
                            id DESC
                        LIMIT 1
                        `,
                        [
                            date,
                            date,
                            time
                        ]
                    );


                let previousMainKwh =
                    null;

                let previousCheckKwh =
                    null;


                if (previousRows.length > 0) {

                    previousMainKwh =
                        number(
                            previousRows[0].main_kwh
                        );


                    previousCheckKwh =
                        number(
                            previousRows[0].check_kwh
                        );

                }


                // =================================
                // ACTUAL CONSUMPTION
                // =================================

                const mainActualKwh =
                    actualConsumption(
                        mainKwh,
                        previousMainKwh
                    );


                const checkActualKwh =
                    actualConsumption(
                        checkKwh,
                        previousCheckKwh
                    );


                // =================================
                // ACTUAL KVAH
                // =================================

                const mainActualKvah =
                    mainKvaMd * 120;


                const checkActualKvah =
                    checkKvaMd * 120;


                // =================================
                // POWER FACTOR
                // =================================

                const calculatedMainPf =
                    mainActualKvah > 0

                        ? mainActualKwh /
                          mainActualKvah

                        : 0;


                const calculatedCheckPf =
                    checkActualKvah > 0

                        ? checkActualKwh /
                          checkActualKvah

                        : 0;


                const finalMainPf =
                    mainPf > 0
                        ? mainPf
                        : calculatedMainPf;


                const finalCheckPf =
                    checkPf > 0
                        ? checkPf
                        : calculatedCheckPf;


                // =================================
                // INSERT INTO MYSQL
                // =================================

                await pool.query(
                    `
                    INSERT INTO meter_readings (

                        reading_date,
                        reading_time,

                        main_kwh,
                        main_kvah,
                        main_actual_kwh_consumption,
                        main_actual_kvah_consumption,
                        main_kva_md,
                        main_actual_kva_md,
                        main_pf_display,
                        main_pf,

                        check_kwh,
                        check_kvah,
                        check_actual_kwh_consumption,
                        check_actual_kvah_consumption,
                        check_kva_md,
                        check_actual_kva_md,
                        check_pf_display,
                        check_pf

                    )
                    VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?, ?, ?
                    )
                    `,
                    [

                        date,
                        time,

                        mainKwh,
                        mainKvah,
                        mainActualKwh,
                        mainActualKvah,
                        mainKvaMd,
                        mainKvaMd * 120,
                        mainPfDisplay,
                        finalMainPf,

                        checkKwh,
                        checkKvah,
                        checkActualKwh,
                        checkActualKvah,
                        checkKvaMd,
                        checkKvaMd * 120,
                        checkPfDisplay,
                        finalCheckPf

                    ]
                );


                imported++;


            } catch (error) {

                skipped++;


                errors.push(
                    `${sheetName} row ${index + 2}: ${error.message}`
                );


                console.error(
                    `❌ Import error at ${sheetName} row ${index + 2}:`,
                    error.message
                );

            }

        }

    }


    // ========================================
    // IMPORT RESULT
    // ========================================

    return {

        imported,

        skipped,

        errors

    };

}


module.exports = {
    importWorkbook
};
