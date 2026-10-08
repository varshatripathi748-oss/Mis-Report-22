// =====================================================
// MIS DASHBOARD - GRAPHQL + MYSQL
// =====================================================

const API_BASE = "http://localhost:4000";
const GRAPHQL_URL = `${API_BASE}/graphql`;
const EXCEL_UPLOAD_URL = `${API_BASE}/api/import-excel`;


// =====================================================
// GLOBAL DATA
// =====================================================

let meterData = [];

let dashboardData = null;

let powerConsumptionChart = null;
let solarMsebChart = null;


// =====================================================
// FILTER STATE
// =====================================================

let currentFromDate = "";
let currentToDate = "";
let currentMeterFilter = "ALL";


// =====================================================
// FORM ELEMENTS
// =====================================================

const meterFormSection =
    document.getElementById("meterFormSection");

const meterForm =
    document.getElementById("meterForm");

const readingDate =
    document.getElementById("readingDate");

const readingTime =
    document.getElementById("readingTime");

const kwhInput =
    document.getElementById("kwhReading");

const kvahInput =
    document.getElementById("kvahReading");

const kvaMDInput =
    document.getElementById("kvaMD");

const meterNameInput =
    document.getElementById("meterName");


// =====================================================
// GRAPHQL REQUEST
// =====================================================

async function graphqlRequest(query, variables = {}) {

    const response = await fetch(
        GRAPHQL_URL,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                query,
                variables
            })
        }
    );


    if (!response.ok) {

        throw new Error(
            `GraphQL HTTP error: ${response.status}`
        );

    }


    const result =
        await response.json();


    if (result.errors && result.errors.length) {

        throw new Error(
            result.errors
                .map(error => error.message)
                .join("\n")
        );

    }


    return result.data;

}


// =====================================================
// LOAD METER DATA FROM MYSQL
// =====================================================

async function loadMeterData() {

    try {

        const query = `
            query GetMeterReadings(
                $from: String,
                $to: String,
                $meter: MeterFilter
            ) {

                meterReadings(
                    from: $from,
                    to: $to,
                    meter: $meter
                ) {

                    id
                    date
                    time

                    main {
                        kwh
                        kvah
                        actualKwhConsumption
                        actualKvahConsumption
                        kvaMd
                        actualKvaMd
                        pfDisplay
                        pf
                    }

                    check {
                        kwh
                        kvah
                        actualKwhConsumption
                        actualKvahConsumption
                        kvaMd
                        actualKvaMd
                        pfDisplay
                        pf
                    }
                }
            }
        `;


        const data =
            await graphqlRequest(
                query,
                {
                    from:
                        currentFromDate || null,

                    to:
                        currentToDate || null,

                    meter:
                        currentMeterFilter
                }
            );


        meterData =
            data.meterReadings || [];


        displayMeterData();

        updateRecentData();

        updateDashboardFromGraphQL();

        updatePowerChart();


    } catch (error) {

        console.error(
            "❌ Failed to load meter data:",
            error
        );


        showConnectionError(
            error.message
        );

    }

}


// =====================================================
// LOAD DASHBOARD FROM MYSQL
// =====================================================

async function loadDashboardData() {

    try {

        const query = `
            query GetDashboard(
                $from: String,
                $to: String,
                $meter: MeterFilter
            ) {

                dashboard(
                    from: $from,
                    to: $to,
                    meter: $meter
                ) {

                    records

                    mainKwh
                    mainKvah

                    mainActualKwh
                    mainActualKvah

                    mainKvaMd
                    mainPf

                    checkKwh
                    checkKvah

                    checkActualKwh
                    checkActualKvah

                    checkKvaMd
                    checkPf
                }
            }
        `;


        const data =
            await graphqlRequest(
                query,
                {
                    from:
                        currentFromDate || null,

                    to:
                        currentToDate || null,

                    meter:
                        currentMeterFilter
                }
            );


        dashboardData =
            data.dashboard;


        updateDashboardFromGraphQL();


    } catch (error) {

        console.error(
            "❌ Failed to load dashboard:",
            error
        );

        showConnectionError(
            error.message
        );

    }

}


// =====================================================
// LOAD EVERYTHING
// =====================================================

async function loadMISData() {

    await Promise.all([
        loadMeterData(),
        loadDashboardData()
    ]);

}


// =====================================================
// CONNECTION ERROR
// =====================================================

function showConnectionError(message) {

    console.error(message);

    const recordElement =
        document.getElementById("dataRecords");

    if (recordElement) {

        recordElement.textContent =
            "Backend Offline";

    }

}


// =====================================================
// ADD EXCEL + FILTER PANEL
// =====================================================

function createMISControls() {

    const mainPage =
        document.getElementById("mainMeterPage");


    if (!mainPage) {
        return;
    }


    if (
        document.getElementById("misDatabaseControls")
    ) {
        return;
    }


    const controls =
        document.createElement("div");


    controls.id =
        "misDatabaseControls";


    controls.style.cssText = `
        margin: 15px 0;
        padding: 18px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: end;
    `;


    controls.innerHTML = `

        <div style="display:flex;flex-direction:column;gap:5px;">
            <label style="font-size:13px;font-weight:600;">
                From Date
            </label>

            <input
                type="date"
                id="filterFromDate"
                style="padding:9px;border:1px solid #d1d5db;border-radius:6px;"
            >
        </div>


        <div style="display:flex;flex-direction:column;gap:5px;">
            <label style="font-size:13px;font-weight:600;">
                To Date
            </label>

            <input
                type="date"
                id="filterToDate"
                style="padding:9px;border:1px solid #d1d5db;border-radius:6px;"
            >
        </div>


        <div style="display:flex;flex-direction:column;gap:5px;">
            <label style="font-size:13px;font-weight:600;">
                Meter
            </label>

            <select
                id="meterFilter"
                style="padding:9px;border:1px solid #d1d5db;border-radius:6px;"
            >
                <option value="ALL">
                    All Meters
                </option>

                <option value="MAIN">
                    Main Meter
                </option>

                <option value="CHECK">
                    Check Meter
                </option>
            </select>
        </div>


        <button
            type="button"
            id="applyMISFilter"
            class="filter-btn"
        >
            🔎 Apply Filter
        </button>


        <button
            type="button"
            id="clearMISFilter"
            class="filter-btn"
        >
            ↺ Clear
        </button>


        <div style="display:flex;flex-direction:column;gap:5px;">
            <label style="font-size:13px;font-weight:600;">
                Excel File
            </label>

            <input
                type="file"
                id="excelFileInput"
                accept=".xlsx,.xls"
                style="max-width:220px;"
            >
        </div>


        <button
            type="button"
            id="uploadExcelBtn"
            class="add-btn"
        >
            📥 Upload Excel
        </button>


        <span
            id="excelUploadStatus"
            style="
                font-size:13px;
                font-weight:600;
            "
        ></span>

    `;


    const filterPanel =
        mainPage.querySelector(
            ".filter-panel"
        );


    if (filterPanel) {

        filterPanel.insertAdjacentElement(
            "afterend",
            controls
        );

    } else {

        mainPage
            .querySelector(".page-title")
            ?.insertAdjacentElement(
                "afterend",
                controls
            );

    }


    setupMISControls();

}


// =====================================================
// SETUP FILTERS + EXCEL
// =====================================================

function setupMISControls() {

    const applyButton =
        document.getElementById(
            "applyMISFilter"
        );


    const clearButton =
        document.getElementById(
            "clearMISFilter"
        );


    const meterFilter =
        document.getElementById(
            "meterFilter"
        );


    const uploadButton =
        document.getElementById(
            "uploadExcelBtn"
        );


    if (applyButton) {

        applyButton.addEventListener(
            "click",
            applyMISFilter
        );

    }


    if (clearButton) {

        clearButton.addEventListener(
            "click",
            clearMISFilter
        );

    }


    if (meterFilter) {

        meterFilter.addEventListener(
            "change",
            () => {

                currentMeterFilter =
                    meterFilter.value;

                loadMISData();

            }
        );

    }


    if (uploadButton) {

        uploadButton.addEventListener(
            "click",
            uploadExcel
        );

    }

}


// =====================================================
// APPLY FILTER
// =====================================================

function applyMISFilter() {

    const from =
        document.getElementById(
            "filterFromDate"
        )?.value || "";


    const to =
        document.getElementById(
            "filterToDate"
        )?.value || "";


    if (
        from &&
        to &&
        from > to
    ) {

        alert(
            "From Date cannot be greater than To Date."
        );

        return;

    }


    currentFromDate =
        from;


    currentToDate =
        to;


    const meterFilter =
        document.getElementById(
            "meterFilter"
        );


    currentMeterFilter =
        meterFilter?.value || "ALL";


    loadMISData();

}


// =====================================================
// CLEAR FILTER
// =====================================================

function clearMISFilter() {

    const from =
        document.getElementById(
            "filterFromDate"
        );


    const to =
        document.getElementById(
            "filterToDate"
        );


    const meter =
        document.getElementById(
            "meterFilter"
        );


    if (from) {
        from.value = "";
    }


    if (to) {
        to.value = "";
    }


    if (meter) {
        meter.value = "ALL";
    }


    currentFromDate = "";
    currentToDate = "";
    currentMeterFilter = "ALL";


    loadMISData();

}


// =====================================================
// EXCEL UPLOAD
// =====================================================

async function uploadExcel() {

    const fileInput =
        document.getElementById(
            "excelFileInput"
        );


    const status =
        document.getElementById(
            "excelUploadStatus"
        );


    if (!fileInput || !fileInput.files.length) {

        alert(
            "Please select an Excel file first."
        );

        return;

    }


    const file =
        fileInput.files[0];


    const allowed =
        [
            ".xlsx",
            ".xls"
        ];


    const extension =
        file.name
            .slice(
                file.name.lastIndexOf(".")
            )
            .toLowerCase();


    if (!allowed.includes(extension)) {

        alert(
            "Only .xlsx and .xls files are allowed."
        );

        return;

    }


    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    if (status) {

        status.textContent =
            "⏳ Uploading...";

    }


    try {

        const response =
            await fetch(
                EXCEL_UPLOAD_URL,
                {
                    method: "POST",
                    body: formData
                }
            );


        const result =
            await response.json();


        if (!response.ok || !result.success) {

            throw new Error(
                result.error ||
                "Excel upload failed."
            );

        }


        if (status) {

            status.textContent =
                `✅ Imported: ${result.imported}, Skipped: ${result.skipped}`;

        }


        let message =
            `Excel import completed.\n\n` +
            `Imported: ${result.imported}\n` +
            `Skipped: ${result.skipped}`;


        if (
            result.errors &&
            result.errors.length
        ) {

            message +=
                `\n\nErrors: ${result.errors.length}`;

        }


        alert(message);


        fileInput.value = "";


        // Refresh dashboard from SQL

        await loadMISData();


    } catch (error) {

        console.error(
            "❌ Excel upload failed:",
            error
        );


        if (status) {

            status.textContent =
                "❌ Upload failed";

        }


        alert(
            `Excel upload failed.\n\n${error.message}`
        );

    }

}


// =====================================================
// OPEN METER FORM
// =====================================================

function openMeterForm() {

    const page =
        document.getElementById(
            "mainMeterPage"
        );


    const dashboard =
        document.getElementById(
            "dashboardPage"
        );


    if (page) {
        page.style.display = "block";
    }


    if (dashboard) {
        dashboard.style.display = "none";
    }


    if (meterFormSection) {

        meterFormSection.classList.add(
            "show"
        );

        setDefaultDateTime();

        calculateConsumption();

        meterFormSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


// =====================================================
// CLOSE FORM
// =====================================================

function closeMeterForm() {

    if (meterFormSection) {

        meterFormSection.classList.remove(
            "show"
        );

    }

}


// =====================================================
// DEFAULT DATE/TIME
// =====================================================

function setDefaultDateTime() {

    if (!readingDate || !readingTime) {
        return;
    }


    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            now.getDate()
        ).padStart(2, "0");


    readingDate.value =
        `${year}-${month}-${day}`;


    readingTime.value =
        now.toTimeString().slice(0, 5);

}


// =====================================================
// GET PREVIOUS READING FROM MYSQL DATA
// =====================================================

function getPreviousRecord(meterName) {

    if (!meterData.length) {
        return null;
    }


    const meterRecords =
        meterData.filter(
            record => {

                if (
                    meterName === "Main Meter"
                ) {

                    return (
                        Number(
                            record.main?.kwh
                        ) !== 0
                    );

                }


                if (
                    meterName === "Check Meter"
                ) {

                    return (
                        Number(
                            record.check?.kwh
                        ) !== 0
                    );

                }


                return false;

            }
        );


    if (!meterRecords.length) {
        return null;
    }


    meterRecords.sort(
        (a, b) => {

            return (
                new Date(
                    `${b.date}T${b.time}`
                ) -

                new Date(
                    `${a.date}T${a.time}`
                )
            );

        }
    );


    return meterRecords[0];

}


// =====================================================
// PREVIOUS KWH
// =====================================================

function getPreviousKwh() {

    const meter =
        meterNameInput?.value;


    if (!meter) {
        return null;
    }


    const previous =
        getPreviousRecord(meter);


    if (!previous) {
        return null;
    }


    if (
        meter === "Main Meter"
    ) {

        return Number(
            previous.main?.kwh || 0
        );

    }


    return Number(
        previous.check?.kwh || 0
    );

}


// =====================================================
// UPDATE PREVIOUS READING
// =====================================================

function updatePreviousReading() {

    const previous =
        getPreviousKwh();


    const element =
        document.getElementById(
            "previousKwh"
        );


    if (!element) {
        return;
    }


    if (
        previous === null ||
        Number.isNaN(previous)
    ) {

        element.textContent =
            "No Previous Data";

    } else {

        element.textContent =
            previous.toFixed(3);

    }

}


// =====================================================
// CALCULATE FORM VALUES
// =====================================================

function calculateConsumption() {

    const currentKwh =
        Number(
            kwhInput?.value
        );


    const kvaMD =
        Number(
            kvaMDInput?.value
        );


    const previousKwh =
        getPreviousKwh();


    let actualKwh = 0;


    if (
        previousKwh !== null &&
        Number.isFinite(currentKwh)
    ) {

        actualKwh =
            (
                currentKwh -
                previousKwh
            ) * 120;


        if (actualKwh < 0) {
            actualKwh = 0;
        }

    }


    let actualKvah = 0;


    if (Number.isFinite(kvaMD)) {

        actualKvah =
            kvaMD * 120;

    }


    let powerFactor = 0;


    if (actualKvah > 0) {

        powerFactor =
            actualKwh /
            actualKvah;

    }


    const previousElement =
        document.getElementById(
            "previousKwh"
        );


    const actualKwhElement =
        document.getElementById(
            "actualKwh"
        );


    const actualKvahElement =
        document.getElementById(
            "actualKvah"
        );


    const pfElement =
        document.getElementById(
            "powerFactor"
        );


    if (previousElement) {

        previousElement.textContent =
            previousKwh === null
                ? "No Data"
                : previousKwh.toFixed(3);

    }


    if (actualKwhElement) {

        actualKwhElement.textContent =
            actualKwh.toFixed(3);

    }


    if (actualKvahElement) {

        actualKvahElement.textContent =
            actualKvah.toFixed(3);

    }


    if (pfElement) {

        pfElement.textContent =
            powerFactor.toFixed(3);

    }

}


// =====================================================
// FORM LIVE CALCULATION
// =====================================================

if (kwhInput) {

    kwhInput.addEventListener(
        "input",
        calculateConsumption
    );

}


if (kvahInput) {

    kvahInput.addEventListener(
        "input",
        calculateConsumption
    );

}


if (kvaMDInput) {

    kvaMDInput.addEventListener(
        "input",
        calculateConsumption
    );

}


if (meterNameInput) {

    meterNameInput.addEventListener(
        "change",
        function () {

            updatePreviousReading();

            calculateConsumption();

        }
    );

}


// =====================================================
// SAVE FORM
// =====================================================

if (meterForm) {

    meterForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /*
             * Current GraphQL schema is query-only.
             * Therefore Excel import is the SQL write path.
             *
             * We do NOT save this form into localStorage anymore.
             */

            alert(
                "Manual Save is temporarily disabled.\n\n" +
                "Please use Excel Upload to insert data into MySQL."
            );

        }
    );

}


// =====================================================
// SHOW DASHBOARD
// =====================================================

function showDashboard() {

    const mainPage =
        document.getElementById(
            "mainMeterPage"
        );


    const dashboard =
        document.getElementById(
            "dashboardPage"
        );


    if (mainPage) {
        mainPage.style.display = "none";
    }


    closeMeterForm();


    if (dashboard) {
        dashboard.style.display = "block";
    }


    loadMISData();

}


// =====================================================
// SHOW MAIN METER
// =====================================================

function showMainMeter() {

    const dashboard =
        document.getElementById(
            "dashboardPage"
        );


    const mainPage =
        document.getElementById(
            "mainMeterPage"
        );


    if (dashboard) {
        dashboard.style.display = "none";
    }


    closeMeterForm();


    if (mainPage) {
        mainPage.style.display = "block";
    }


    loadMeterData();

}


// =====================================================
// METER TABLE
// =====================================================

function displayMeterData() {

    const tableBody =
        document.getElementById(
            "meterTableBody"
        );


    if (!tableBody) {
        return;
    }


    if (!meterData.length) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="no-data"
                >
                    No meter data available.
                </td>
            </tr>
        `;

        return;

    }


    const rows = [];


    meterData.forEach(
        record => {

            const main =
                record.main || {};


            const check =
                record.check || {};


            if (
                currentMeterFilter === "ALL" ||
                currentMeterFilter === "MAIN"
            ) {

                if (
                    Number(main.kwh) !== 0 ||
                    Number(main.kvah) !== 0 ||
                    Number(main.kvaMd) !== 0
                ) {

                    rows.push({

                        id:
                            record.id,

                        date:
                            record.date,

                        time:
                            record.time,

                        meter:
                            "Main Meter",

                        kwh:
                            Number(main.kwh || 0),

                        kvah:
                            Number(main.kvah || 0),

                        kvaMD:
                            Number(main.kvaMd || 0),

                        actualKwh:
                            Number(
                                main.actualKwhConsumption || 0
                            ),

                        actualKvah:
                            Number(
                                main.actualKvahConsumption || 0
                            ),

                        powerFactor:
                            Number(main.pf || 0)

                    });

                }

            }


            if (
                currentMeterFilter === "ALL" ||
                currentMeterFilter === "CHECK"
            ) {

                if (
                    Number(check.kwh) !== 0 ||
                    Number(check.kvah) !== 0 ||
                    Number(check.kvaMd) !== 0
                ) {

                    rows.push({

                        id:
                            record.id,

                        date:
                            record.date,

                        time:
                            record.time,

                        meter:
                            "Check Meter",

                        kwh:
                            Number(check.kwh || 0),

                        kvah:
                            Number(check.kvah || 0),

                        kvaMD:
                            Number(check.kvaMd || 0),

                        actualKwh:
                            Number(
                                check.actualKwhConsumption || 0
                            ),

                        actualKvah:
                            Number(
                                check.actualKvahConsumption || 0
                            ),

                        powerFactor:
                            Number(check.pf || 0)

                    });

                }

            }

        }
    );


    rows.sort(
        (a, b) => {

            return (
                new Date(
                    `${b.date}T${b.time}`
                ) -

                new Date(
                    `${a.date}T${a.time}`
                )
            );

        }
    );


    if (!rows.length) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="no-data"
                >
                    No data found for selected filter.
                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        rows.map(
            row => `

                <tr>

                    <td>
                        ${escapeHtml(row.date)}
                    </td>

                    <td>
                        ${escapeHtml(row.time)}
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(row.meter)}
                        </strong>
                    </td>

                    <td>
                        ${row.kwh.toFixed(3)}
                    </td>

                    <td>
                        ${row.kvah.toFixed(3)}
                    </td>

                    <td>
                        ${row.kvaMD.toFixed(3)}
                    </td>

                    <td>
                        ${row.actualKwh.toFixed(3)}
                    </td>

                    <td>
                        ${row.actualKvah.toFixed(3)}
                    </td>

                    <td>
                        ${row.powerFactor.toFixed(3)}
                    </td>

                    <td>
                        <span>
                            SQL
                        </span>
                    </td>

                </tr>

            `
        )
        .join("");

}


// =====================================================
// SEARCH
// =====================================================

const meterSearch =
    document.getElementById(
        "meterSearch"
    );


if (meterSearch) {

    meterSearch.addEventListener(
        "input",
        function () {

            const searchValue =
                this.value
                    .toLowerCase()
                    .trim();


            const tableBody =
                document.getElementById(
                    "meterTableBody"
                );


            if (!tableBody) {
                return;
            }


            const rows =
                tableBody.querySelectorAll(
                    "tr"
                );


            rows.forEach(
                row => {

                    const text =
                        row.textContent
                            .toLowerCase();


                    row.style.display =
                        text.includes(
                            searchValue
                        )
                            ? ""
                            : "none";

                }
            );

        }
    );

}


// =====================================================
// SHOW ALL
// =====================================================

function showAllMeterData() {

    if (meterSearch) {
        meterSearch.value = "";
    }


    currentFromDate = "";
    currentToDate = "";
    currentMeterFilter = "ALL";


    const from =
        document.getElementById(
            "filterFromDate"
        );


    const to =
        document.getElementById(
            "filterToDate"
        );


    const meter =
        document.getElementById(
            "meterFilter"
        );


    if (from) {
        from.value = "";
    }


    if (to) {
        to.value = "";
    }


    if (meter) {
        meter.value = "ALL";
    }


    loadMISData();

}


// =====================================================
// DASHBOARD UPDATE
// =====================================================

function updateDashboardFromGraphQL() {

    if (!dashboardData) {
        return;
    }


    const data =
        dashboardData;


    const recordCount =
        document.getElementById(
            "dataRecords"
        );


    if (recordCount) {

        recordCount.textContent =
            data.records;

    }


    // -----------------------------------------------
    // MSEB / MAIN CONSUMPTION
    // -----------------------------------------------

    const mseb =
        document.getElementById(
            "msebConsumption"
        );


    if (mseb) {

        mseb.textContent =
            Number(
                data.mainActualKwh || 0
            ).toFixed(2);

    }


    // -----------------------------------------------
    // POWER FACTOR
    // -----------------------------------------------

    const pf =
        document.getElementById(
            "dashboardPF"
        );


    if (pf) {

        const pfValue =
            currentMeterFilter === "CHECK"
                ? data.checkPf
                : data.mainPf;


        pf.textContent =
            Number(
                pfValue || 0
            ).toFixed(3);

    }


    // -----------------------------------------------
    // KVA MD
    // -----------------------------------------------

    const kvaMD =
        document.getElementById(
            "dashboardKvaMD"
        );


    if (kvaMD) {

        const kvaValue =
            currentMeterFilter === "CHECK"
                ? data.checkKvaMd
                : data.mainKvaMd;


        kvaMD.textContent =
            Number(
                kvaValue || 0
            ).toFixed(3);

    }


    // -----------------------------------------------
    // CURRENT MONTH / FILTER
    // -----------------------------------------------

    const month =
        document.getElementById(
            "currentMonth"
        );


    if (month) {

        if (
            currentFromDate ||
            currentToDate
        ) {

            month.textContent =
                "Filtered";

        } else {

            month.textContent =
                new Date()
                    .toLocaleDateString(
                        "en-IN",
                        {
                            month: "long",
                            year: "numeric"
                        }
                    );

        }

    }

}


// =====================================================
// RECENT DATA
// =====================================================

function updateRecentData() {

    const tableBody =
        document.getElementById(
            "recentDataBody"
        );


    if (!tableBody) {
        return;
    }


    const rows = [];


    meterData.forEach(
        record => {

            const main =
                record.main || {};


            const check =
                record.check || {};


            if (
                Number(main.kwh) !== 0 ||
                Number(main.kvah) !== 0
            ) {

                rows.push({

                    date:
                        record.date,

                    meter:
                        "Main Meter",

                    reading:
                        Number(
                            main.kwh || 0
                        ),

                    consumption:
                        Number(
                            main.actualKwhConsumption || 0
                        )

                });

            }


            if (
                Number(check.kwh) !== 0 ||
                Number(check.kvah) !== 0
            ) {

                rows.push({

                    date:
                        record.date,

                    meter:
                        "Check Meter",

                    reading:
                        Number(
                            check.kwh || 0
                        ),

                    consumption:
                        Number(
                            check.actualKwhConsumption || 0
                        )

                });

            }

        }
    );


    rows.sort(
        (a, b) =>
            new Date(b.date) -
            new Date(a.date)
    );


    const recent =
        rows.slice(0, 5);


    if (!recent.length) {

        tableBody.innerHTML = `
            <tr>
                <td>--</td>
                <td>--</td>
                <td>--</td>
                <td>--</td>
                <td>No Data</td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        recent.map(
            row => `

                <tr>

                    <td>
                        ${escapeHtml(row.date)}
                    </td>

                    <td>
                        ${escapeHtml(row.meter)}
                    </td>

                    <td>
                        ${row.reading.toFixed(3)}
                        kWh
                    </td>

                    <td>
                        ${row.consumption.toFixed(3)}
                        kWh
                    </td>

                    <td>
                        <span
                            style="
                                background:#dcfce7;
                                color:#166534;
                                padding:5px 9px;
                                border-radius:5px;
                            "
                        >
                            SQL
                        </span>
                    </td>

                </tr>

            `
        )
        .join("");

}


// =====================================================
// POWER CONSUMPTION CHART
// =====================================================

function updatePowerChart() {

    const canvas =
        document.getElementById(
            "powerConsumptionChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }


    const monthlyData =
        Array(12).fill(0);


    meterData.forEach(
        record => {

            const date =
                new Date(record.date);


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return;
            }


            const month =
                date.getMonth();


            let consumption = 0;


            if (
                currentMeterFilter === "CHECK"
            ) {

                consumption =
                    Number(
                        record.check
                            ?.actualKwhConsumption ||
                        0
                    );

            } else {

                consumption =
                    Number(
                        record.main
                            ?.actualKwhConsumption ||
                        0
                    );

            }


            monthlyData[month] +=
                consumption;

        }
    );


    if (powerConsumptionChart) {

        powerConsumptionChart.destroy();

    }


    powerConsumptionChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels: [
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec"
                    ],

                    datasets: [

                        {

                            label:
                                currentMeterFilter === "CHECK"
                                    ? "Check Meter Consumption"
                                    : "Main Meter Consumption",

                            data:
                                monthlyData,

                            borderWidth: 2,

                            tension: 0.3

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false

                }

            }
        );

}


// =====================================================
// SOLAR VS MSEB
// =====================================================

function createSolarChart() {

    const canvas =
        document.getElementById(
            "solarMsebChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }


    if (solarMsebChart) {

        solarMsebChart.destroy();

    }


    const mseb =
        Number(
            dashboardData?.mainActualKwh || 0
        );


    solarMsebChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: [
                        "MSEB",
                        "Solar"
                    ],

                    datasets: [

                        {

                            data: [
                                mseb,
                                0
                            ],

                            borderWidth: 1

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false

                }

            }
        );

}


// =====================================================
// SAFE HTML
// =====================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// =====================================================
// PAGE INITIALIZATION
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        // Dashboard visible initially

        const dashboard =
            document.getElementById(
                "dashboardPage"
            );


        const mainPage =
            document.getElementById(
                "mainMeterPage"
            );


        if (dashboard) {

            dashboard.style.display =
                "block";

        }


        if (mainPage) {

            mainPage.style.display =
                "none";

        }


        closeMeterForm();


        setDefaultDateTime();


        // Add Excel + filter controls

        createMISControls();


        // Load SQL data

        await loadMISData();


        // Solar chart

        createSolarChart();

    }
);
