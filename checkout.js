document.addEventListener("DOMContentLoaded", function () {
   const authToken = Cookies.get("authToken");
   const toast = window.toast;
   const toastMessage = document.getElementById("toastMessage");

   if (!authToken) {
      toastMessage.textContent = "Please login first!";
      toast.show();
      setTimeout(() => {
         window.location.href = "/";
      }, 2000);
      return;
   }

   //  code for "Select your fare class" box
   const fareClassBoxes = document.querySelectorAll(".fare_box");
   fareClassBoxes.forEach((box) => {
      box.addEventListener("click", function () {
         fareClassBoxes.forEach((boxitem) =>
            boxitem.classList.remove("selected-box"),
         );
         this.classList.add("selected-box");
         const selectedValue = this.getAttribute("class-value");
         let aircraftDetails = JSON.parse(
            sessionStorage.getItem("aircraft_details") || "{}",
         );
         aircraftDetails.fare_class = selectedValue;
         sessionStorage.setItem(
            "aircraft_details",
            JSON.stringify(aircraftDetails),
         );
      });
   });

   //  code for "Add-ons and services" box
   const addOnBoxes = document.querySelectorAll(".add_ons[data-key]");
   addOnBoxes.forEach((box) => {
      box.addEventListener("click", function () {
         this.classList.toggle("selected-box");
         const key = this.getAttribute("data-key");
         let aircraftDetails = JSON.parse(
            sessionStorage.getItem("aircraft_details") || "{}",
         );
         aircraftDetails[key] = this.classList.contains("selected-box")
            ? "Yes"
            : "No";
         sessionStorage.setItem(
            "aircraft_details",
            JSON.stringify(aircraftDetails),
         );
      });
   });

   //  code for "Crowdsource" box
   const crowdsourceBox = document.querySelectorAll(".crowdsource[data-key]");
   crowdsourceBox.forEach((box) => {
      box.addEventListener("click", function () {
         this.classList.toggle("selected-box");
         const key = this.getAttribute("data-key");
         let aircraftDetails = JSON.parse(
            sessionStorage.getItem("aircraft_details") || "{}",
         );
         aircraftDetails[key] = this.classList.contains("selected-box")
            ? "Yes"
            : "No";
         sessionStorage.setItem(
            "aircraft_details",
            JSON.stringify(aircraftDetails),
         );
      });
   });

   function setInitialActiveStates() {
      const aircraftDetails = JSON.parse(
         sessionStorage.getItem("aircraft_details") || "{}",
      );

      if (aircraftDetails.fare_class) {
         const fareBox = document.querySelector(
            `.fare_box[class-value="${aircraftDetails.fare_class}"]`,
         );
         if (fareBox) {
            document
               .querySelectorAll(".fare_box")
               .forEach((box) => box.classList.remove("selected-box"));
            fareBox.classList.add("selected-box");
         }
      }

      document.querySelectorAll(".add_ons[data-key]").forEach((box) => {
         const key = box.getAttribute("data-key");
         if (aircraftDetails[key] === "Yes") {
            box.classList.add("selected-box");
         }
      });

      const crowdsourceBox = document.querySelector(
         '.crowdsource[data-key="crowdsource"]',
      );
      if (crowdsourceBox && aircraftDetails.crowdsource === "Yes") {
         crowdsourceBox.classList.add("selected-box");
      }
   }
   setInitialActiveStates();

   // code for continue and back buttons
   document.getElementById("cntstepone").classList.add("active");
   const continueButtons = document.querySelectorAll(".cnt_btn");
   continueButtons.forEach((button) => {
      button.addEventListener("click", function () {
         const currentBox = this.closest(".cng_step_wrapper");
         const nextBox = currentBox.nextElementSibling;

         // Validate date and time inputs in the current step
         const dateInputs = currentBox.querySelectorAll(".store-date-input");
         const timeInputs = currentBox.querySelectorAll(
            ".departure-time-input",
         );

         let allFilled = true;

         dateInputs.forEach((input) => {
            if (!input.value) {
               allFilled = false;
               input.style.border = "1.5px solid red";
            } else {
               input.style.border = "";
            }
         });

         timeInputs.forEach((input) => {
            if (!input.value) {
               allFilled = false;
               input.style.border = "1.5px solid red";
            } else {
               input.style.border = "";
            }
         });

         if (!allFilled) {
            const toastMessage = document.getElementById("toastMessage");
            const toast = window.toast;
            if (toastMessage && toast) {
               toastMessage.textContent =
                  "Please select date and time before proceeding.";
               toast.show();
            }
            return;
         }

         if (nextBox) {
            currentBox.classList.remove("active");
            nextBox.classList.add("active");
         }
      });
   });

   const backButtons = document.querySelectorAll(".backbtn");
   backButtons.forEach((button) => {
      button.addEventListener("click", function () {
         const currentBox = this.closest(".cng_step_wrapper");
         const previousBox = currentBox.previousElementSibling;
         if (previousBox) {
            currentBox.classList.remove("active");
            previousBox.classList.add("active");
         }
      });
   });

   // ── Step tab click navigation (go back to previous steps) ────
   const allStepWrappers = document.querySelectorAll(".cng_step_wrapper");

   allStepWrappers.forEach((wrapper, currentStepIndex) => {
      const stepTabs = wrapper.querySelectorAll(".ch_step");

      stepTabs.forEach((tab, tabIndex) => {
         // Only allow clicking on previous steps
         if (tabIndex < currentStepIndex) {
            tab.classList.add("clickable-step");
            tab.addEventListener("click", () => {
               wrapper.classList.remove("active");
               allStepWrappers[tabIndex].classList.add("active");
            });
         }
      });
   });
});

//-- Checkout page functionality --

document.addEventListener("DOMContentLoaded", function () {
   // ── HubSpot webhook ──────────────────────────────────────────
   async function fireHubSpotWebhook({
      email,
      checkout_value,
      category,
      item_name,
      CheckoutURL,
      ItemNames,
   }) {
      try {
         const authToken = Cookies.get("authToken");

         const response = await fetch(
            "https://operators-dashboard.bubbleapps.io/version-test/api/1.1/wf/started_checkout",
            {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${authToken}`,
               },
               body: JSON.stringify({
                  email: email,
                  checkout_value: String(checkout_value),
                  category: category,
                  item_name: item_name,
                  CheckoutURL: CheckoutURL,
                  ItemNames: ItemNames,
               }),
            },
         );

         if (!response.ok) {
            throw new Error(`Bubble API error! status: ${response.status}`);
         }
      } catch (error) {
         console.error("Error firing Bubble started-checkout API:", error);
      }
   }

   // ── Klaviyo + HubSpot + Tatari ───────────────────────────────
   function fireKlaviyoStartedCheckout(aircraftDetails, apiResponse) {
      try {
         const aircraft = apiResponse.response.aircraft;
         const category = apiResponse.response.category;
         const eventId = `${aircraftDetails.flightRequestId}${Date.now()}`;

         const eventData = {
            $event_id: eventId,
            $value: apiResponse.response.flightrequest.client_budget_number,
            ItemNames: aircraft.description_text,
            CheckoutURL: window.location.href,
            Categories: category,
            Items: [
               {
                  ProductID: aircraft._id,
                  SKU: aircraft.registration_text,
                  ProductName: aircraft.description_text,
                  Quantity: 1,
                  ItemPrice:
                     apiResponse.response.flightrequest.client_budget_number,
                  RowTotal:
                     apiResponse.response.flightrequest.client_budget_number,
                  ProductURL: `https://jettly.com/fleet/${aircraft.Slug}`,
                  ImageURL: `https:${aircraft.exterior_image1_image}`,
                  ProductCategories: category,
               },
            ],
         };

         if (
            typeof window.klaviyo !== "undefined" &&
            typeof window.klaviyo.track === "function"
         ) {
            // Fire Klaviyo
            window.klaviyo.track("Started Checkout", eventData);

            // Fire HubSpot at the same time
            fireHubSpotWebhook({
               email: Cookies.get("userEmail"),
               checkout_value:
                  apiResponse.response.flightrequest.client_budget_number,
               category: category,
               item_name: aircraft.description_text,
               CheckoutURL: window.location.href,
               ItemNames: aircraft.description_text,
            });

            // Fire Tatari
            if (
               typeof tatari !== "undefined" &&
               typeof tatari.checkoutStarted === "function"
            ) {
               tatari.checkoutStarted({
                  total:
                     Number(
                        apiResponse.response.flightrequest.client_budget_number,
                     ) || 0,
                  currency: "USD",
                  items: [
                     {
                        name: aircraft.description_text || "Charter Flight",
                        price:
                           Number(
                              apiResponse.response.flightrequest
                                 .client_budget_number,
                           ) || 0,
                        quantity: 1,
                        productId: aircraft._id || "unknown",
                        category: category || "Charter",
                     },
                  ],
               });
            }
         } else {
            console.warn("Klaviyo not available for tracking");
         }
      } catch (error) {
         console.error("Error firing Started Checkout event:", error);
      }
   }

   // ── Main checkout flow ───────────────────────────────────────
   async function startCheckout() {
      try {
         const aircraftDetailsStr = sessionStorage.getItem("aircraft_details");
         if (!aircraftDetailsStr) return;

         const aircraftDetails = JSON.parse(aircraftDetailsStr);
         const authToken = Cookies.get("authToken");
         const userEmail = Cookies.get("userEmail");

         if (!authToken) return;

         const response = await fetch(
            "https://operators-dashboard.bubbleapps.io/api/1.1/wf/klaviyo_start_checkout",
            {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${authToken}`,
               },
               body: JSON.stringify({
                  flightrequestid: aircraftDetails.flightRequestId,
                  aircraftid: aircraftDetails.aircraftId,
                  price: aircraftDetails.price,
                  email: userEmail,
               }),
            },
         );

         if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
         }

         const result = await response.json();
         fireKlaviyoStartedCheckout(aircraftDetails, result);
      } catch (error) {
         console.error("Error calling checkout API:", error);
      }
   }

   startCheckout();
});

//-- Build date/time inputs from aircraft_details (session storage) and pre-fill date/time

document.addEventListener("DOMContentLoaded", function () {
   // ── Read aircraft_details from session storage ─────────────────
   const detailsStr = sessionStorage.getItem("aircraft_details");
   if (!detailsStr) return;

   let details;
   try {
      details = JSON.parse(detailsStr);
   } catch (e) {
      console.error("Error parsing aircraft_details from session storage:", e);
      return;
   }

   // ── Format date to YYYY-MM-DD for HTML date input ────────────
   function formatStoreDateForInput(dateString) {
      if (!dateString) return "";
      // If already in YYYY-MM-DD format, return directly (no Date object = no timezone shift)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
         return dateString;
      }
      // If YYYY-MM-DD with extra characters (e.g. "2026-06-27T00:00:00"), extract just the date
      if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
         return dateString.substring(0, 10);
      }
      // For any other format, parse as local date
      try {
         const date = new Date(dateString);
         if (isNaN(date.getTime())) return "";
         const y = date.getFullYear();
         const m = String(date.getMonth() + 1).padStart(2, "0");
         const d = String(date.getDate()).padStart(2, "0");
         return `${y}-${m}-${d}`;
      } catch {
         return "";
      }
   }

   // ── Convert 24h time (HH:MM:SS) to 12h format (HH:MM AM/PM) ──
   function time24to12(timeStr) {
      if (!timeStr) return "";
      const parts = timeStr.split(":");
      let h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) || 0;
      if (isNaN(h)) return "";
      // Round minutes to nearest 30
      const roundedMin = m < 15 ? 0 : m < 45 ? 30 : 0;
      if (m >= 45) h = (h + 1) % 24;
      const ampm = h < 12 ? "AM" : "PM";
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const hourStr = String(hour12).padStart(2, "0");
      const minStr = roundedMin === 0 ? "00" : "30";
      return `${hourStr}:${minStr} ${ampm}`;
   }

   // ── Generate 24-hour time slots in 30-minute increments ──────
   function generateTimeSlots() {
      const slots = [];
      for (let h = 0; h < 24; h++) {
         for (let m = 0; m < 60; m += 30) {
            const hour12 = h % 12 === 0 ? 12 : h % 12;
            const hourStr = String(hour12).padStart(2, "0");
            const ampm = h < 12 ? "AM" : "PM";
            const min = m === 0 ? "00" : "30";
            slots.push(`${hourStr}:${min} ${ampm}`);
         }
      }
      return slots;
   }

   // ── Determine trip type ──────────────────────────────────────
   const wayLower = details.way.toLowerCase();
   const isOneWay = wayLower.includes("one");
   const isMultiCity = wayLower.includes("multi");
   const isRoundTrip = !isOneWay && !isMultiCity;

   const formattedDate = formatStoreDateForInput(
      Array.isArray(details.dateAsText)
         ? details.dateAsText[0]
         : details.dateAsText,
   );
   const formattedReturnDate = formatStoreDateForInput(
      details.returnDateAsText,
   );

   // ── Build time values for autofill ────────────────────────────
   // One way / Round trip: timeAsText is a string
   // Multi-city: timeAsText is an array
   const outboundTime = time24to12(
      Array.isArray(details.timeAsText)
         ? details.timeAsText[0]
         : details.timeAsText,
   );
   const returnTime = time24to12(details.returnTimeAsText);

   // ── Find the container to render into ────────────────────────
   const tripContainer = document.querySelector(".ch_trip_det_cnt");
   if (!tripContainer) return;

   // ── Build the HTML ───────────────────────────────────────────
   let tripHTML = "";

   if (isOneWay) {
      // One Way: 1 date + 1 time
      tripHTML = `
        <div class="trip_details_bottom">
          <h4>Trip Type</h4>
          <div class="trip_date_oneway ch_one_way">
            <p>One Way</p>
            <div class="trip_one_date">
              <div class="ch_leg_wrapper">
               <div class="ch_date">
                 <label>Flight Date</label>
                 <input type="date" class="store-date-input" data-leg-index="0" value="${formattedDate}" onclick="this.showPicker()" />
               </div>
               <div class="ch_date ch_time">
                 <label>Departure Time</label>
                 <input type="text" class="departure-time-input depurtuetimeoneway" data-leg-index="0" readonly placeholder="Select time" />
                 <div class="time-dropdown" style="display:none;"></div>
               </div>
              </div>
            </div>
          </div>
        </div>
      `;
   } else if (isRoundTrip) {
      // Round Trip: 2 dates + 2 times
      tripHTML = `
        <div class="trip_details_bottom">
          <h4>Trip Type</h4>
          <div class="trip_date_oneway ch_round_way">
            <p>Round Trip</p>
            <div class="trip_one_date">
              <div class="ch_leg_wrapper">
               <div class="ch_date ch_data_one">
                 <label>Outbound Flight</label>
                 <input type="date" class="store-date-input" data-leg-index="0" value="${formattedDate}" onclick="this.showPicker()" />
               </div>
               <div class="ch_date ch_time">
                 <label>Departure Time</label>
                 <input type="text" class="departure-time-input depurturetimeroundway" data-leg-index="0" readonly placeholder="Select time" />
                 <div class="time-dropdown" style="display:none;"></div>
               </div>
              </div>
              <div class="ch_leg_wrapper">
               <div class="ch_date ch_data_two">
                 <label>Return Flight</label>
                 <input type="date" class="store-date-input" data-leg-index="1" value="${formattedReturnDate}" onclick="this.showPicker()" />
               </div>
               <div class="ch_date ch_time">
                 <label>Departure Time</label>
                 <input type="text" class="departure-time-input returnTimeRoundWay" data-leg-index="1" readonly placeholder="Select time" />
                 <div class="time-dropdown" style="display:none;"></div>
               </div>
              </div>
            </div>
          </div>
        </div>
      `;
   } else if (isMultiCity) {
      // Multi-City: N dates + N times (from arrays)
      const dates = Array.isArray(details.dateAsText)
         ? details.dateAsText
         : [details.dateAsText];
      const times = Array.isArray(details.timeAsText)
         ? details.timeAsText
         : [details.timeAsText];
      const fromNames = Array.isArray(details.fromShortName)
         ? details.fromShortName
         : [details.fromShortName];
      const toNames = Array.isArray(details.toShortName)
         ? details.toShortName
         : [details.toShortName];
      const legCount = dates.length;

      let legsHTML = "";
      for (let i = 0; i < legCount; i++) {
         const legDate = formatStoreDateForInput(dates[i]);
         const legTime = time24to12(times[i]);
         const fromName = fromNames[i] || "";
         const toName = toNames[i] || "";
         legsHTML += `
              <div class="ch_leg_wrapper">
               <div class="ch_date ch_data_multi">
                 <label>Leg ${i + 1}: ${fromName} → ${toName}</label>
                 <input type="date" class="store-date-input" data-leg-index="${i}" value="${legDate}" onclick="this.showPicker()" />
               </div>
               <div class="ch_date ch_time">
                 <label>Departure Time</label>
                 <input type="text" class="departure-time-input" data-leg-index="${i}" readonly placeholder="Select time" />
                 <div class="time-dropdown" style="display:none;"></div>
               </div>
              </div>
        `;
      }

      tripHTML = `
        <div class="trip_details_bottom">
          <h4>Trip Type</h4>
          <div class="trip_date_oneway ch_multi_city">
            <p>Multi-City</p>
            <div class="trip_one_date">
              ${legsHTML}
            </div>
          </div>
        </div>
      `;
   }

   tripContainer.innerHTML = tripHTML;

   // ── Setup time dropdowns ─────────────────────────────────────
   const timeInputs = tripContainer.querySelectorAll(".departure-time-input");
   const timeDropdowns = tripContainer.querySelectorAll(".time-dropdown");
   const slots = generateTimeSlots();

   timeInputs.forEach((input, idx) => {
      const dropdown = timeDropdowns[idx];
      if (!dropdown) return;

      // Build dropdown options
      dropdown.innerHTML =
         `<div class="time-reset">RESET</div>` +
         slots.map((time) => `<div class="time-slot">${time}</div>`).join("");

      // Show dropdown on click
      input.addEventListener("click", (e) => {
         e.stopPropagation();
         dropdown.style.display = "block";
      });

      // Hide dropdown on outside click
      document.addEventListener("click", (e) => {
         if (!dropdown.contains(e.target) && e.target !== input) {
            dropdown.style.display = "none";
         }
      });

      // Handle time slot selection
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

   // ── Convert 12h time (HH:MM AM/PM) back to 24h (HH:MM:SS) ───
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

   // ── Sync date change to sessionStorage ────────────────────────
   function syncDateToSession(dateInput) {
      const legIndex = parseInt(dateInput.getAttribute("data-leg-index"), 10);
      const newDate = dateInput.value; // YYYY-MM-DD
      const stored = JSON.parse(
         sessionStorage.getItem("aircraft_details") || "{}",
      );

      if (isOneWay) {
         stored.dateAsText = newDate;
      } else if (isRoundTrip) {
         if (legIndex === 0) {
            stored.dateAsText = newDate;
         } else {
            stored.returnDateAsText = newDate;
         }
      } else if (isMultiCity) {
         if (!Array.isArray(stored.dateAsText)) {
            stored.dateAsText = [stored.dateAsText];
         }
         stored.dateAsText[legIndex] = newDate;
      }

      sessionStorage.setItem("aircraft_details", JSON.stringify(stored));
   }

   // ── Sync time change to sessionStorage ────────────────────────
   function syncTimeToSession(timeInput) {
      const legIndex = parseInt(timeInput.getAttribute("data-leg-index"), 10);
      const newTime = time12to24(timeInput.value);
      const stored = JSON.parse(
         sessionStorage.getItem("aircraft_details") || "{}",
      );

      if (isOneWay) {
         stored.timeAsText = newTime;
      } else if (isRoundTrip) {
         if (legIndex === 0) {
            stored.timeAsText = newTime;
         } else {
            stored.returnTimeAsText = newTime;
         }
      } else if (isMultiCity) {
         if (!Array.isArray(stored.timeAsText)) {
            stored.timeAsText = [stored.timeAsText];
         }
         stored.timeAsText[legIndex] = newTime;
      }

      sessionStorage.setItem("aircraft_details", JSON.stringify(stored));
   }

   // ── Attach date change listeners ─────────────────────────────
   const dateInputs = tripContainer.querySelectorAll(".store-date-input");
   dateInputs.forEach((dateInput) => {
      dateInput.addEventListener("change", () => {
         syncDateToSession(dateInput);
      });
   });
});
