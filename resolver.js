const pool = require("./db");


// ========================================
// HELPER FUNCTIONS
// ========================================

function num(value) {
    if (value === null || value === undefined || value === "") {
        return 0;
    }

    const n = Number(value);

    return Number.isFinite(n) ? n : 0;
}


function formatDate(value) {

    if (!value) {
        return null;
    }

    if (typeof value === "string") {
        return value.slice(0, 10);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString().slice(0, 10);
}


function formatTime(value) {

    if (!value) {
        return null;
    }

    if (typeof value === "string") {

        if (value.length === 5) {
            return `${value}:00`;
        }

        return value;
    }

    return String(value);
}


// ========================================
// DATABASE ROW → GRAPHQL OBJECT
// ========================================

function mapRow(row) {

    return {

        id: row.id,

        date: formatDate(row.reading_date),

        time: formatTime(row.reading_time),


        // --------------------------------
        // MAIN METER
        // --------------------------------

        main: {

            kwh: num(row.main_kwh),

            kvah: num(row.main_kvah),

            actualKwhConsumption:
                num(row.main_actual_kwh_consumption),

            actualKvahConsumption:
                num(row.main_actual_kvah_consumption),

            kvaMd:
                num(row.main_kva_md),

            actualKvaMd:
                num(row.main_actual_kva_md),

            pfDisplay:
                num(row.main_pf_display),

            pf:
                num(row.main_pf)

        },


        // --------------------------------
        // CHECK METER
        // --------------------------------

        check: {

            kwh: num(row.check_kwh),

            kvah: num(row.check_kvah),

            actualKwhConsumption:
                num(row.check_actual_kwh_consumption),

            actualKvahConsumption:
                num(row.check_actual_kvah_consumption),

            kvaMd:
                num(row.check_kva_md),

            actualKvaMd:
                num(row.check_actual_kva_md),

            pfDisplay:
                num(row.check_pf_display),

            pf:
                num(row.check_pf)

        },


        createdAt:
            row.created_at
                ? new Date(row.created_at).toISOString()
                : null,

        updatedAt:
            row.updated_at
                ? new Date(row.updated_at).toISOString()
                : null

    };
}


// ========================================
// DATE FILTER
// ========================================

function buildDateFilter(from, to) {

    const conditions = [];

    const params = [];


    if (from) {

        conditions.push(
            "reading_date >= ?"
        );

        params.push(from);

    }


    if (to) {

        conditions.push(
            "reading_date <= ?"
        );

        params.push(to);

    }


    return {

        sql:
            conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "",

        params

    };

}


// ========================================
// GET DATABASE ROWS
// ========================================

async function getRows(from, to) {

    const filter =
        buildDateFilter(from, to);


    const [rows] =
        await pool.query(

            `
            SELECT *
            FROM meter_readings

            ${filter.sql}

            ORDER BY
                reading_date DESC,
                reading_time DESC,
                id DESC
            `,

            filter.params

        );


    return rows;

}


// ========================================
// CHECK WHETHER MAIN METER HAS DATA
// ========================================

function hasMainData(row) {

    return (

        num(row.main_kwh) !== 0 ||

        num(row.main_kvah) !== 0 ||

        num(row.main_kva_md) !== 0 ||

        num(row.main_actual_kwh_consumption) !== 0 ||

        num(row.main_actual_kvah_consumption) !== 0

    );

}


// ========================================
// CHECK WHETHER CHECK METER HAS DATA
// ========================================

function hasCheckData(row) {

    return (

        num(row.check_kwh) !== 0 ||

        num(row.check_kvah) !== 0 ||

        num(row.check_kva_md) !== 0 ||

        num(row.check_actual_kwh_consumption) !== 0 ||

        num(row.check_actual_kvah_consumption) !== 0

    );

}


// ========================================
// FILTER ROWS BY METER
// ========================================

function filterByMeter(rows, meter) {

    if (meter === "MAIN") {

        return rows.filter(hasMainData);

    }


    if (meter === "CHECK") {

        return rows.filter(hasCheckData);

    }


    return rows;

}


// ========================================
// SUM
// ========================================

function sum(rows, getter) {

    return rows.reduce(

        (total, row) => {

            return total + num(getter(row));

        },

        0

    );

}


// ========================================
// AVERAGE
// ========================================

function average(rows, getter) {

    if (rows.length === 0) {
        return 0;
    }


    return (
        sum(rows, getter) /
        rows.length
    );

}


// ========================================
// GRAPHQL RESOLVERS
// ========================================

const resolvers = {


    // ====================================
    // METER READINGS
    // ====================================

    meterReadings: async ({
        from,
        to,
        meter
    }) => {

        const rows =
            await getRows(from, to);


        const filteredRows =
            filterByMeter(rows, meter);


        return filteredRows.map(
            mapRow
        );

    },


    // ====================================
    // DASHBOARD
    // ====================================

    dashboard: async ({
        from,
        to,
        meter
    }) => {

        const rows =
            await getRows(from, to);


        const selectedRows =
            filterByMeter(rows, meter);


        // --------------------------------
        // MAIN DATA
        // --------------------------------

        const mainKwh =
            sum(
                selectedRows,
                row => row.main_kwh
            );


        const mainKvah =
            sum(
                selectedRows,
                row => row.main_kvah
            );


        const mainActualKwh =
            sum(
                selectedRows,
                row =>
                    row.main_actual_kwh_consumption
            );


        const mainActualKvah =
            sum(
                selectedRows,
                row =>
                    row.main_actual_kvah_consumption
            );


        const mainKvaMd =
            selectedRows.length > 0

                ? Math.max(
                    ...selectedRows.map(
                        row =>
                            num(row.main_kva_md)
                    )
                )

                : 0;


        const mainPfRows =
            selectedRows.filter(
                row =>
                    num(row.main_pf) > 0
            );


        const mainPf =
            average(
                mainPfRows,
                row => row.main_pf
            );


        // --------------------------------
        // CHECK DATA
        // --------------------------------

        const checkKwh =
            sum(
                selectedRows,
                row => row.check_kwh
            );


        const checkKvah =
            sum(
                selectedRows,
                row => row.check_kvah
            );


        const checkActualKwh =
            sum(
                selectedRows,
                row =>
                    row.check_actual_kwh_consumption
            );


        const checkActualKvah =
            sum(
                selectedRows,
                row =>
                    row.check_actual_kvah_consumption
            );


        const checkKvaMd =
            selectedRows.length > 0

                ? Math.max(
                    ...selectedRows.map(
                        row =>
                            num(row.check_kva_md)
                    )
                )

                : 0;


        const checkPfRows =
            selectedRows.filter(
                row =>
                    num(row.check_pf) > 0
            );


        const checkPf =
            average(
                checkPfRows,
                row => row.check_pf
            );


        // --------------------------------
        // RETURN DASHBOARD DATA
        // --------------------------------

        return {

            records:
                selectedRows.length,

            mainKwh,

            mainKvah,

            mainActualKwh,

            mainActualKvah,

            mainKvaMd,

            mainPf,

            checkKwh,

            checkKvah,

            checkActualKwh,

            checkActualKvah,

            checkKvaMd,

            checkPf

        };

    }

};


module.exports = resolvers;
