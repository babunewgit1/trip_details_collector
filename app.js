document.addEventListener("DOMContentLoaded", function () {
   const detailsStr = sessionStorage.getItem("storeData");
   if (!detailsStr) return;

   let details;
   try {
      details = JSON.parse(detailsStr);
   } catch (e) {
      return;
   }

   // ── Helpers ────────────────────────────────────────────────────

   function time12to24(timeStr) {
      if (!timeStr) return "00:00:00";
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return "00:00:00";
      let h = parseInt(match[1], 10);
      const m = match[2];
      const ampm = match[3].toUpperCase();
      if (ampm === "AM" && h === 12) h = 0;
      if (ampm === "PM" && h !== 12) h += 12;
      return `${String(h).padStart(2, "0")}:${m}:00`;
   }

   function generateTimeSlots() {
      const slots = [];
      for (let h = 0; h < 24; h++) {
         for (let m = 0; m < 60; m += 30) {
            const hour12 = h % 12 === 0 ? 12 : h % 12;
            const ampm = h < 12 ? "AM" : "PM";
            slots.push(
               `${String(hour12).padStart(2, "0")}:${m === 0 ? "00" : "30"} ${ampm}`,
            );
         }
      }
      return slots;
   }

   function formatDateDisplay(dateStr) {
      if (!dateStr) return "Select Date";
      const [year, month, day] = dateStr.split("-");
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString("en-US", {
         day: "numeric",
         month: "short",
         year: "numeric",
      });
   }

   // ── Determine trip type ──────────────────────────────────────

   const wayLower = (details.way || "").toLowerCase();
   const isOneWay = wayLower.includes("one");
   const isMultiCity = wayLower.includes("multi");
   const isRoundTrip = !isOneWay && !isMultiCity;

   // ── Build HTML ───────────────────────────────────────────────

   const container = document.querySelector(".dt_popup_flight_form");
   if (!container) return;

   const formattedDate = details.dateAsText || "";
   const formattedReturnDate = details.returnDateAsText || "";

   function buildLegHTML(legIndex, badgeText, dateValue) {
      const displayDate = formatDateDisplay(dateValue);
      return `
         <div class="dtp_leg_block" data-leg-index="${legIndex}">
            <div class="dtp_leg_badge">${badgeText}</div>
            <div class="dtp_leg_fields">
               <div class="dtp_date_field">
                  <label>DEPARTURE DATE</label>
                  <div class="dtp_date_input_wrapper">
                     <input type="text" class="store-date-input" data-leg-index="${legIndex}" data-date-value="${dateValue}" value="${displayDate}" readonly placeholder="Select Date" />
                     <img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6a5dcef85210fea67e54f59a_date.svg" alt="calendar" class="dtp_date_icon" />
                     <div class="dtp_calendar_dropdown" style="display:none;">
                        <div class="calendar-wrapper">
                           <div class="month-nav">
                              <button type="button" class="cal_prev">
                                 <img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6a5cb7fb70221493ca0848e4_Group%203.svg" alt="prev" />
                              </button>
                              <h3 class="cal_month_year"></h3>
                              <button type="button" class="cal_next">
                                 <img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6a5cb7fbe1af4cb77dfe4a01_Group%202.svg" alt="next" />
                              </button>
                           </div>
                           <div class="days-header">
                              <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span>
                              <span>THU</span><span>FRI</span><span>SAT</span>
                           </div>
                           <ul class="days-grid"></ul>
                        </div>
                     </div>
                  </div>
               </div>
               <div class="dtp_time_field">
                   <label>PREFERRED DEPARTURE TIME</label>
                   <div class="dtp_time_input_wrapper">
                      <input type="text" class="departure-time-input" data-leg-index="${legIndex}" readonly placeholder="Select time" value="" />
                      <img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6a5dcef819824fd8eee58abe_clock.svg" alt="clock" class="dtp_time_icon" />
                      <div class="time-dropdown" style="display:none;"></div>
                   </div>
               </div>
            </div>
         </div>
      `;
   }

   let tripHTML = "";

   if (isOneWay) {
      tripHTML = buildLegHTML(
         0,
         `Leg 1: ${details.fromShortName || ""} → ${details.toShortName || ""}`,
         formattedDate,
      );
   } else if (isRoundTrip) {
      tripHTML =
         buildLegHTML(
            0,
            `Leg 1: ${details.fromShortName || ""} → ${details.toShortName || ""}`,
            formattedDate,
         ) +
         buildLegHTML(
            1,
            `Leg 2: ${details.toShortName || ""} → ${details.fromShortName || ""}`,
            formattedReturnDate,
         );
   } else if (isMultiCity) {
      const dates = Array.isArray(details.dateAsText)
         ? details.dateAsText
         : [details.dateAsText];
      const fromNames = Array.isArray(details.fromShortName)
         ? details.fromShortName
         : [details.fromShortName];
      const toNames = Array.isArray(details.toShortName)
         ? details.toShortName
         : [details.toShortName];

      for (let i = 0; i < dates.length; i++) {
         tripHTML += buildLegHTML(
            i,
            `Leg ${i + 1}: ${fromNames[i] || ""} → ${toNames[i] || ""}`,
            dates[i] || "",
         );
      }
   }

   container.innerHTML = tripHTML;

   // ── Setup custom date pickers (same as popup_v1.7.js) ─────────

   const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
   ];

   container.querySelectorAll(".store-date-input").forEach((input) => {
      const dropdown = input
         .closest(".dtp_date_field")
         .querySelector(".dtp_calendar_dropdown");
      const daysGrid = dropdown.querySelector(".days-grid");
      const monthYearText = dropdown.querySelector(".cal_month_year");
      const prevBtn = dropdown.querySelector(".cal_prev");
      const nextBtn = dropdown.querySelector(".cal_next");

      const initialDate = input.getAttribute("data-date-value");
      let currYear, currMonth;
      let selectedDate = null; // { day, month, year }

      if (initialDate) {
         const p = initialDate.split("-");
         currYear = parseInt(p[0], 10);
         currMonth = parseInt(p[1], 10) - 1;
         selectedDate = {
            day: parseInt(p[2], 10),
            month: currMonth,
            year: currYear,
         };
      } else {
         const now = new Date();
         currYear = now.getFullYear();
         currMonth = now.getMonth();
      }

      const isSameDate = (d1, d2) =>
         d1 &&
         d2 &&
         d1.day === d2.day &&
         d1.month === d2.month &&
         d1.year === d2.year;

      function renderCalendar() {
         const firstDayofMonth = new Date(currYear, currMonth, 1).getDay();
         const lastDateofMonth = new Date(currYear, currMonth + 1, 0).getDate();
         const lastDayofLastMonth = new Date(currYear, currMonth, 0).getDate();
         const lastDayofMonth = new Date(
            currYear,
            currMonth,
            lastDateofMonth,
         ).getDay();

         const now = new Date();
         const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
         );

         let liTag = "";

         // Previous month padding
         const prevMonthVal = currMonth === 0 ? 11 : currMonth - 1;
         const prevMonthYear = currMonth === 0 ? currYear - 1 : currYear;

         for (let i = firstDayofMonth; i > 0; i--) {
            const day = lastDayofLastMonth - i + 1;
            const dateToCheck = new Date(prevMonthYear, prevMonthVal, day);
            let className = "prev-month-day";

            if (dateToCheck < today) {
               className += " disabled";
            } else {
               const currentDayObj = {
                  day,
                  month: prevMonthVal,
                  year: prevMonthYear,
               };
               if (isSameDate(currentDayObj, selectedDate)) {
                  className += " active";
               }
            }
            liTag += `<li class="${className}" data-day="${day}" data-month="${prevMonthVal}" data-year="${prevMonthYear}">${day}</li>`;
         }

         // Current month days
         for (let i = 1; i <= lastDateofMonth; i++) {
            const dateToCheck = new Date(currYear, currMonth, i);
            let className = "";

            if (dateToCheck < today) {
               className = "disabled";
            } else {
               const currentDayObj = {
                  day: i,
                  month: currMonth,
                  year: currYear,
               };
               if (isSameDate(currentDayObj, selectedDate)) {
                  className = "active";
               }
            }
            liTag += `<li class="${className}" data-day="${i}" data-month="${currMonth}" data-year="${currYear}">${i}</li>`;
         }

         // Next month padding
         const nextMonthVal = currMonth === 11 ? 0 : currMonth + 1;
         const nextMonthYear = currMonth === 11 ? currYear + 1 : currYear;

         for (let i = lastDayofMonth; i < 6; i++) {
            const day = i - lastDayofMonth + 1;
            liTag += `<li class="prev-month-day" data-day="${day}" data-month="${nextMonthVal}" data-year="${nextMonthYear}">${day}</li>`;
         }

         monthYearText.textContent = `${months[currMonth].toUpperCase()}, ${currYear}`;
         daysGrid.innerHTML = liTag;

         // Attach click listeners to selectable days
         daysGrid.querySelectorAll("li:not(.disabled)").forEach((li) => {
            li.addEventListener("click", (e) => {
               e.stopPropagation();
               const d = parseInt(li.getAttribute("data-day"));
               const m = parseInt(li.getAttribute("data-month"));
               const y = parseInt(li.getAttribute("data-year"));

               selectedDate = { day: d, month: m, year: y };

               const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
               input.value = formatDateDisplay(dateStr);
               input.setAttribute("data-date-value", dateStr);
               dropdown.style.display = "none";
               syncDateToSession(input);
            });
         });
      }

      // Navigation
      prevBtn.addEventListener("click", (e) => {
         e.stopPropagation();
         currMonth--;
         if (currMonth < 0) {
            currMonth = 11;
            currYear--;
         }
         renderCalendar();
      });

      nextBtn.addEventListener("click", (e) => {
         e.stopPropagation();
         currMonth++;
         if (currMonth > 11) {
            currMonth = 0;
            currYear++;
         }
         renderCalendar();
      });

      // Show/hide calendar
      const dateIcon = input
         .closest(".dtp_date_input_wrapper")
         .querySelector(".dtp_date_icon");
      const openCalendar = (e) => {
         e.stopPropagation();
         // Close all other dropdowns
         container.querySelectorAll(".dtp_calendar_dropdown").forEach((dd) => {
            if (dd !== dropdown) dd.style.display = "none";
         });
         container.querySelectorAll(".time-dropdown").forEach((dd) => {
            dd.style.display = "none";
         });
         renderCalendar();
         dropdown.style.display = "block";
      };
      input.addEventListener("click", openCalendar);
      dateIcon.addEventListener("click", openCalendar);

      document.addEventListener("click", (e) => {
         if (
            !dropdown.contains(e.target) &&
            e.target !== input &&
            e.target !== dateIcon
         ) {
            dropdown.style.display = "none";
         }
      });
   });

   // ── Setup time dropdowns ─────────────────────────────────────

   const timeInputs = container.querySelectorAll(".departure-time-input");
   const timeDropdowns = container.querySelectorAll(".time-dropdown");
   const slots = generateTimeSlots();

   timeInputs.forEach((input, idx) => {
      const dropdown = timeDropdowns[idx];
      if (!dropdown) return;

      dropdown.innerHTML =
         `<div class="time-reset">RESET</div>` +
         slots.map((time) => `<div class="time-slot">${time}</div>`).join("");

      const timeIcon = input
         .closest(".dtp_time_input_wrapper")
         .querySelector(".dtp_time_icon");
      const openTimeDropdown = (e) => {
         e.stopPropagation();
         // Close all other dropdowns
         container.querySelectorAll(".time-dropdown").forEach((dd) => {
            if (dd !== dropdown) dd.style.display = "none";
         });
         container.querySelectorAll(".dtp_calendar_dropdown").forEach((dd) => {
            dd.style.display = "none";
         });
         dropdown.style.display = "block";
      };
      input.addEventListener("click", openTimeDropdown);
      timeIcon.addEventListener("click", openTimeDropdown);

      document.addEventListener("click", (e) => {
         if (
            !dropdown.contains(e.target) &&
            e.target !== input &&
            e.target !== timeIcon
         ) {
            dropdown.style.display = "none";
         }
      });

      dropdown.addEventListener("click", (e) => {
         if (e.target.classList.contains("time-slot")) {
            input.value = e.target.textContent;
            dropdown.style.display = "none";
            syncTimeToSession(input);
         }
         if (e.target.classList.contains("time-reset")) {
            input.value = "";
            dropdown.style.display = "none";
            syncTimeToSession(input);
         }
      });
   });

   // ── Sync date to sessionStorage ──────────────────────────────

   function syncDateToSession(dateInput) {
      const legIndex = parseInt(dateInput.getAttribute("data-leg-index"), 10);
      const newDate = dateInput.getAttribute("data-date-value");
      const stored = JSON.parse(sessionStorage.getItem("storeData") || "{}");

      if (isOneWay) {
         stored.dateAsText = newDate;
      } else if (isRoundTrip) {
         if (legIndex === 0) stored.dateAsText = newDate;
         else stored.returnDateAsText = newDate;
      } else if (isMultiCity) {
         if (!Array.isArray(stored.dateAsText))
            stored.dateAsText = [stored.dateAsText];
         stored.dateAsText[legIndex] = newDate;
      }

      sessionStorage.setItem("storeData", JSON.stringify(stored));
   }

   // ── Sync time to sessionStorage ──────────────────────────────

   function syncTimeToSession(timeInput) {
      const legIndex = parseInt(timeInput.getAttribute("data-leg-index"), 10);
      const newTime = time12to24(timeInput.value);
      const stored = JSON.parse(sessionStorage.getItem("storeData") || "{}");

      if (isOneWay) {
         stored.timeAsText = newTime;
      } else if (isRoundTrip) {
         if (legIndex === 0) stored.timeAsText = newTime;
         else stored.returnTimeAsText = newTime;
      } else if (isMultiCity) {
         if (!Array.isArray(stored.timeAsText))
            stored.timeAsText = [stored.timeAsText];
         stored.timeAsText[legIndex] = newTime;
      }

      sessionStorage.setItem("storeData", JSON.stringify(stored));
   }
});
