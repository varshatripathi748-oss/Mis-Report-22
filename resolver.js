const pool = require("./db");

const resolvers = {

    // =========================
    // GET ALL METER READINGS
    // =========================
    meterReadings: async () => {

        const [rows] = await pool.query(`
            SELECT
                id,
                reading_date,
                reading_time,
                meter,
                kwh,
                kvah,
                kva_md,
                previous_kwh,
                actual_kwh,
                actual_kvah,
                power_factor
            FROM meter_readings
            ORDER BY reading_date DESC, reading_time DESC
        `);

        return rows.map(row => ({
            id: row.id,
            date: row.reading_date.toISOString().split("T")[0],
            time: row.reading_time,
            meter: row.meter,
            kwh: Number(row.kwh),
            kvah: Number(row.kvah),
            kvaMD: Number(row.kva_md),
            previousKwh: row.previous_kwh === null
                ? null
                : Number(row.previous_kwh),
            actualKwh: Number(row.actual_kwh),
            actualKvah: Number(row.actual_kvah),
            powerFactor: Number(row.power_factor)
        }));
    },


    // =========================
    // GET SINGLE READING
    // =========================
    meterReading: async ({ id }) => {

        const [rows] = await pool.query(`
            SELECT
                id,
                reading_date,
                reading_time,
                meter,
                kwh,
                kvah,
                kva_md,
                previous_kwh,
                actual_kwh,
                actual_kvah,
                power_factor
            FROM meter_readings
            WHERE id = ?
        `, [id]);

        if (rows.length === 0) {
            return null;
        }

        const row = rows[0];

        return {
            id: row.id,
            date: row.reading_date.toISOString().split("T")[0],
            time: row.reading_time,
            meter: row.meter,
            kwh: Number(row.kwh),
            kvah: Number(row.kvah),
            kvaMD: Number(row.kva_md),
            previousKwh: row.previous_kwh === null
                ? null
                : Number(row.previous_kwh),
            actualKwh: Number(row.actual_kwh),
            actualKvah: Number(row.actual_kvah),
            powerFactor: Number(row.power_factor)
        };
    },


    // =========================
    // ADD METER READING
    // =========================
    addMeterReading: async ({ input }) => {

        const {
            date,
            time,
            meter,
            kwh,
            kvah,
            kvaMD
        } = input;


        // Find previous reading of the same meter
        const [previousRows] = await pool.query(`
            SELECT kwh
            FROM meter_readings
            WHERE meter = ?
            ORDER BY reading_date DESC, reading_time DESC
            LIMIT 1
        `, [meter]);


        let previousKwh = null;
        let actualKwh = 0;


        if (previousRows.length > 0) {

            previousKwh = Number(previousRows[0].kwh);

            actualKwh = (Number(kwh) - previousKwh) * 120;

            // Same logic as your existing frontend
            if (actualKwh < 0) {
                actualKwh = 0;
            }
        }


        // Same calculation used by your existing script
        const actualKvah = Number(kvaMD) * 120;

        let powerFactor = 0;

        if (actualKvah !== 0) {
            powerFactor = actualKwh / actualKvah;
        }


        // Insert into MySQL
        const [result] = await pool.query(`
            INSERT INTO meter_readings (
                reading_date,
                reading_time,
                meter,
                kwh,
                kvah,
                kva_md,
                previous_kwh,
                actual_kwh,
                actual_kvah,
                power_factor
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            date,
            time,
            meter,
            kwh,
            kvah,
            kvaMD,
            previousKwh,
            actualKwh,
            actualKvah,
            powerFactor
        ]);


        // Return newly created record
        return {
            id: result.insertId,
            date,
            time,
            meter,
            kwh: Number(kwh),
            kvah: Number(kvah),
            kvaMD: Number(kvaMD),
            previousKwh,
            actualKwh,
            actualKvah,
            powerFactor
        };
    },


    // =========================
    // DELETE READING
    // =========================
    deleteMeterReading: async ({ id }) => {

        const [result] = await pool.query(`
            DELETE FROM meter_readings
            WHERE id = ?
        `, [id]);

        return result.affectedRows > 0;
    },


    // =========================
    // UPDATE READING
    // =========================
    updateMeterReading: async ({ id, input }) => {

        const {
            date,
            time,
            meter,
            kwh,
            kvah,
            kvaMD
        } = input;


        // Find previous reading excluding current record
        const [previousRows] = await pool.query(`
            SELECT kwh
            FROM meter_readings
            WHERE meter = ?
              AND id != ?
            ORDER BY reading_date DESC, reading_time DESC
            LIMIT 1
        `, [meter, id]);


        let previousKwh = null;
        let actualKwh = 0;


        if (previousRows.length > 0) {

            previousKwh = Number(previousRows[0].kwh);

            actualKwh = (Number(kwh) - previousKwh) * 120;

            if (actualKwh < 0) {
                actualKwh = 0;
            }
        }


        const actualKvah = Number(kvaMD) * 120;

        let powerFactor = 0;

        if (actualKvah !== 0) {
            powerFactor = actualKwh / actualKvah;
        }


        await pool.query(`
            UPDATE meter_readings
            SET
                reading_date = ?,
                reading_time = ?,
                meter = ?,
                kwh = ?,
                kvah = ?,
                kva_md = ?,
                previous_kwh = ?,
                actual_kwh = ?,
                actual_kvah = ?,
                power_factor = ?
            WHERE id = ?
        `, [
            date,
            time,
            meter,
            kwh,
            kvah,
            kvaMD,
            previousKwh,
            actualKwh,
            actualKvah,
            powerFactor,
            id
        ]);


        return {
            id,
            date,
            time,
            meter,
            kwh: Number(kwh),
            kvah: Number(kvah),
            kvaMD: Number(kvaMD),
            previousKwh,
            actualKwh,
            actualKvah,
            powerFactor
        };
    }
};


module.exports = resolvers;