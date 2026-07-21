//book_now_v4.js
const API_ENDPOINT =
   "https://operators-dashboard.bubbleapps.io/api/1.1/wf/book_now_button";

// Helper Functions
const formatPrice = (price) => {
   return Number(price).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
   });
};

const getOrdinalSuffix = (day) => {
   if (day > 3 && day < 21) return "th";
   switch (day % 10) {
      case 1:
         return "st";
      case 2:
         return "nd";
      case 3:
         return "rd";
      default:
         return "th";
   }
};

// Helper function to parse date string as local date (prevents timezone shifts)
const parseLocalDate = (dateString) => {
   if (!dateString) return new Date();

   // If date string is in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss), parse it as local time
   const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
   if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1; // month is 0-indexed in JavaScript
      const day = parseInt(isoMatch[3], 10);
      return new Date(year, month, day);
   }

   // For other formats, parse and reconstruct using UTC methods to avoid timezone shifts
   // This ensures we get the exact date from the string regardless of timezone
   const tempDate = new Date(dateString);
   if (isNaN(tempDate.getTime())) {
      // If parsing failed, return current date
      return new Date();
   }
   // Use UTC methods to extract the date components as they appear in the string
   // Then construct a local date with those exact values
   const year = tempDate.getUTCFullYear();
   const month = tempDate.getUTCMonth();
   const day = tempDate.getUTCDate();
   return new Date(year, month, day);
};

const formatDate = (dateString) => {
   const date = parseLocalDate(dateString);
   const formattedDate = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
   });
   const day = date.getDate();
   return formattedDate.replace(day, `${day}${getOrdinalSuffix(day)}`);
};

const generateExtraItemHtml = (label, value) => {
   if (!value) return "";
   return `
    <div class="extra_item">
      <p>${label}</p>
      <p>$ ${formatPrice(value)}</p>
    </div>
  `;
};

const generateLegHtml = (leg) => {
   return `
    <div class="leg_main-wrapper">
      <div class="leg_item_wrapper small_leg">
        <div class="pl_leg_details">
          <div class="pl_leg_left">
            <div class="pl_lgdestination">
              <div class="pllg_left_time">
                <p>12:00 am</p>
              </div>
              <div class="pllg_left_place">
                <div class="pllg_left_place_wrapper">
                  <p>${leg.mobile_app_from_airport_name_short_text || ""} ${leg.mobile_app_from_city_text_text || ""} 
                     ${leg.mobile_app_from_airport_icao_code_text || ""} / ${leg.mobile_app_from_airport_iata_code_text || ""} / 
                     ${leg.mobile_app_from_airport_faa_code_text || ""} - ${leg.mobile_app_to_airport_name_short_text || ""} 
                     ${leg.mobile_app_to_city_text_text || ""} ${leg.mobile_app_to_airport_icao_code_text || ""} / 
                     ${leg.mobile_app_to_airport_iata_code_text || ""} / ${leg.mobile_app_to_airport_faa_code_text || ""}</p>
                  <p class="para flyingjettly only_jettly">Jettly</p>
                </div>
              </div>
            </div>
          </div>
          <div class="pl_leg_right">
            <div class="wifi_img white_wifi_img">
              <img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/67e672adefa14cdd32ff5653_wifi.png" alt="wifi img" />
            </div>
            <div class="wifi_para wifi_text">
              <p>Wi-Fi likely available Plane type Light Jet Whole aircraft charter</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

// Main Function
document.addEventListener("DOMContentLoaded", async function () {
   // Initialize toast elements
   const toastElement = document.getElementById("notificationToast");
   const toastMessage = document.getElementById("toastMessage");
   const toast = new Toast(toastElement);
   const loader = document.querySelector(".loading_animation");
   if (loader) loader.style.display = "flex";

   try {
      const authToken = Cookies.get("authToken");
      if (!authToken) {
         if (loader) loader.style.display = "none";
         toastMessage.textContent = "Please login first!";
         toast.show();
         setTimeout(() => (window.location.href = "index.html"), 2000);
         return;
      }

      // Validate required data
      const aircraftDetails = JSON.parse(
         sessionStorage.getItem("aircraft_details") || "{}",
      );
      const storedData = JSON.parse(
         sessionStorage.getItem("aircraft_details") || "{}",
      );
      const defineWay = storedData.way;

      const requiredFields = [
         "type",
         "aircraftId",
         "flightRequestId",
         "fare_class",
         "catering",
         "groundtransfers",
         "de_icinginsurance",
         "crowdsource",
      ];

      if (!requiredFields.every((field) => aircraftDetails[field])) {
         if (loader) loader.style.display = "none";
         toastMessage.textContent = "Missing required booking information";
         toast.show();
         setTimeout(function () {
            window.location.href = "/";
         }, 2000);
         return;
      }

      // ── Build date_as_text and date arrays for API ─────────────
      // Helper: Convert 24h time to 12h format
      function time24to12(timeStr) {
         if (!timeStr) return "12:00 AM";
         const [h, m] = timeStr.split(":").map(Number);
         const period = h >= 12 ? "PM" : "AM";
         const hour12 = h % 12 || 12;
         return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
      }

      function dateTimeToUnix(dateStr, timeStr) {
         const [y, mo, d] = dateStr.split("-").map(Number);
         const [h, mi, s] = (timeStr || "00:00:00").split(":").map(Number);
         return Date.UTC(y, mo - 1, d, h, mi, s);
      }

      // Combine date + time into readable text (e.g. "Jul 1, 2026 4:00 PM")
      function dateTimeToText(dateStr, timeStr) {
         const [y, mo, d] = dateStr.split("-").map(Number);
         const [h, mi] = (timeStr || "00:00:00").split(":").map(Number);
         const date = new Date(y, mo - 1, d, h, mi);
         return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
         });
      }

      const wayLower = (defineWay || "").toLowerCase();
      let dateAsTextArray = [];
      let dateTimestampArray = [];
      let dateArray = [];
      let timeArray = [];

      if (wayLower === "multi-city") {
         const dates = Array.isArray(aircraftDetails.dateAsText)
            ? aircraftDetails.dateAsText
            : [aircraftDetails.dateAsText];
         const times = Array.isArray(aircraftDetails.timeAsText)
            ? aircraftDetails.timeAsText
            : [aircraftDetails.timeAsText];
         dateArray = dates;
         timeArray = times.map((t) => time24to12(t));
         dateAsTextArray = dates.map((dt, i) =>
            dateTimeToText(dt, times[i] || "00:00:00"),
         );
         dateTimestampArray = dates.map((dt, i) =>
            dateTimeToUnix(dt, times[i] || "00:00:00"),
         );
      } else if (wayLower === "round trip") {
         dateArray = [
            aircraftDetails.dateAsText,
            aircraftDetails.returnDateAsText,
         ];
         timeArray = [
            time24to12(aircraftDetails.timeAsText),
            time24to12(aircraftDetails.returnTimeAsText),
         ];
         dateAsTextArray = [
            dateTimeToText(
               aircraftDetails.dateAsText,
               aircraftDetails.timeAsText,
            ),
            dateTimeToText(
               aircraftDetails.returnDateAsText,
               aircraftDetails.returnTimeAsText,
            ),
         ];
         dateTimestampArray = [
            dateTimeToUnix(
               aircraftDetails.dateAsText,
               aircraftDetails.timeAsText,
            ),
            dateTimeToUnix(
               aircraftDetails.returnDateAsText,
               aircraftDetails.returnTimeAsText,
            ),
         ];
      } else {
         dateArray = [aircraftDetails.dateAsText];
         timeArray = [time24to12(aircraftDetails.timeAsText)];
         dateAsTextArray = [
            dateTimeToText(
               aircraftDetails.dateAsText,
               aircraftDetails.timeAsText,
            ),
         ];
         dateTimestampArray = [
            dateTimeToUnix(
               aircraftDetails.dateAsText,
               aircraftDetails.timeAsText,
            ),
         ];
      }

      // API Call
      const response = await fetch(API_ENDPOINT, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
         },
         body: JSON.stringify({
            type: aircraftDetails.type,
            aircraftid: aircraftDetails.aircraftId,
            flightrequestid: aircraftDetails.flightRequestId,
            fare_class: aircraftDetails.fare_class,
            catering: aircraftDetails.catering || "No",
            groundtransfers: aircraftDetails.groundtransfers || "No",
            de_icinginsurance: aircraftDetails.de_icinginsurance || "No",
            crowdsource: aircraftDetails.crowdsource || "No",
            way: defineWay,
         }),
      });

      if (!response.ok) {
         throw new Error("API request failed");
      }

      const { response: dataSet } = await response.json();
      if (!dataSet?.flightlegs?.length) {
         throw new Error("Invalid response data");
      }

      // code for sending data with api in bubble server
      //! dom element selector
      const aircraftId = dataSet.aircraftid;
      const flightRequestId = dataSet.flightrequestid;
      // Add payment method tracking
      let selectedPaymentMethod = "";

      const paymentRadios = document.querySelectorAll(
         ".radio_payment .rdinputlabel",
      );
      const paymentBlock = document.querySelectorAll(".wps_wrapper[ptype]");

      paymentRadios.forEach((radio) => {
         radio.addEventListener("click", function () {
            const paymentText =
               this.querySelector(".resv_inp_rdo_text")?.textContent?.trim() ||
               "";
            selectedPaymentMethod = paymentText;

            // Remove active class from all and add to clicked one
            paymentRadios.forEach((r) => r.classList.remove("rdio_active"));
            this.classList.add("rdio_active");

            const pinputAttr = radio.getAttribute("id");

            paymentBlock.forEach((pblock) => {
               const pblockAttr = pblock.getAttribute("ptype");

               if (pinputAttr === pblockAttr) {
                  pblock.classList.add("active-content");
               } else {
                  pblock.classList.remove("active-content");
               }
            });
         });
      });

      // Add checkout button click handler
      document
         .querySelector(".checkout_button a")
         .addEventListener("click", async function (e) {
            e.preventDefault();

            // Save original text and show loading state
            const bookBtn = this;
            const originalText = bookBtn.textContent;
            bookBtn.textContent = "Please Wait.";
            bookBtn.style.pointerEvents = "none";
            bookBtn.style.opacity = "0.6";

            // Animated dots
            let dotCount = 1;
            const dotInterval = setInterval(() => {
               dotCount = (dotCount % 3) + 1;
               bookBtn.textContent = "Please Wait" + ".".repeat(dotCount);
            }, 400);

            // Get the latest values by checking which radio buttons have "selected" class
            const fiftyHoursRadio = document.querySelector(
               '.resv_inp_bradio[data-hours="fiftyHours"]',
            );
            const hundredHoursRadio = document.querySelector(
               '.resv_inp_bradio[data-hours="hundredHours"]',
            );
            const twohundredHoursRadio = document.querySelector(
               '.resv_inp_bradio[data-hours="twohundredHours"]',
            );
            const unlimitedRadio = document.querySelector(
               '.resv_inp_bradio[data-hours="unlimited"]',
            );

            const updatedValues = {
               fiftyHours: fiftyHoursRadio?.classList.contains("selected")
                  ? "yes"
                  : "no",
               hundredHours: hundredHoursRadio?.classList.contains("selected")
                  ? "yes"
                  : "no",
               twohundredHours: twohundredHoursRadio?.classList.contains(
                  "selected",
               )
                  ? "yes"
                  : "no",
               unlimited: unlimitedRadio?.classList.contains("selected")
                  ? "yes"
                  : "no",
               firstName: document.querySelector("#First_name")?.value || "",
               lastName: document.querySelector("#lastname")?.value || "",
               middleName: document.querySelector("#middle_name")?.value || "",
               dob: document.querySelector("#bod")?.value || "",
               emailAddress:
                  document.querySelector("#emailaddress-2")?.value || "",
               phoneNumber: document.querySelector("#phonenumber")?.value || "",
               nationality: document.querySelector("#country")?.value || "",
               bod: document.querySelector("#bod")?.value || "",
               paymentMethod: selectedPaymentMethod,
               aircraftId,
               flightRequestId,
            };

            try {
               const authToken = Cookies.get("authToken");
               if (!authToken) {
                  toastMessage.textContent = "Please login first!";
                  toast.show();
                  return;
               }

               // Get selected gender
               const selectedGender = document.querySelector(
                  'input[name="gender"]:checked',
               )?.value;

               // Validate all required fields
               const requiredFields = {
                  firstName: updatedValues.firstName,
                  lastName: updatedValues.lastName,
                  emailAddress: updatedValues.emailAddress,
                  phoneNumber: updatedValues.phoneNumber,
                  nationality: updatedValues.nationality,
                  paymentMethod: updatedValues.paymentMethod,
                  aircraftId: updatedValues.aircraftId,
                  flightRequestId: updatedValues.flightRequestId,
                  gender: selectedGender,
                  bod: updatedValues.bod,
               };

               // Check if any required field is empty
               const emptyFields = Object.entries(requiredFields)
                  .filter(([_, value]) => !value || value.trim() === "")
                  .map(([key]) => {
                     // Format field names with proper spacing and capitalization
                     switch (key) {
                        case "firstName":
                           return "First Name";
                        case "lastName":
                           return "Last Name";
                        case "middleName":
                           return "Middle Name";
                        case "emailAddress":
                           return "Email Address";
                        case "phoneNumber":
                           return "Phone Number";
                        case "paymentMethod":
                           return "Payment Method";
                        case "gender":
                           return "Gender";
                        case "bod":
                           return "Birth of date";
                        default:
                           // Capitalize first letter for single word fields
                           return key.charAt(0).toUpperCase() + key.slice(1);
                     }
                  });

               if (emptyFields.length > 0) {
                  toastMessage.textContent = `Please fill in all required fields: ${emptyFields.join(", ")}`;
                  toast.show();
                  return;
               }

               // Validate email format
               const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
               if (!emailRegex.test(updatedValues.emailAddress)) {
                  toastMessage.textContent =
                     "Please enter a valid email address";
                  toast.show();
                  return;
               }

               // Validate phone number (basic validation for numbers and common separators)
               const phoneRegex = /^[0-9+\-\s()]+$/;
               if (!phoneRegex.test(updatedValues.phoneNumber)) {
                  toastMessage.textContent =
                     "Please enter a valid phone number";
                  toast.show();
                  return;
               }

               // Make API call
               const response = await fetch(
                  "https://operators-dashboard.bubbleapps.io/api/1.1/wf/confirm_booking",
                  {
                     method: "POST",
                     headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${authToken}`,
                     },
                     body: JSON.stringify({
                        firstname: updatedValues.firstName.trim(),
                        lastname: updatedValues.lastName.trim(),
                        middlename: updatedValues.middleName
                           ? updatedValues.middleName.trim()
                           : "",
                        dob: updatedValues.dob ? updatedValues.dob.trim() : "",
                        emailaddress: updatedValues.emailAddress.trim(),
                        phonenumber: updatedValues.phoneNumber.trim(),
                        nationality: updatedValues.nationality.trim(),
                        paymentmethod: updatedValues.paymentMethod.trim(),
                        gender: selectedGender,
                        aircraftid: updatedValues.aircraftId,
                        flightrequestid: updatedValues.flightRequestId,
                        "50hours": updatedValues.fiftyHours || "no",
                        "100hours": updatedValues.hundredHours || "no",
                        "200hours": updatedValues.twohundredHours || "no",
                        unlimited: updatedValues.unlimited || "no",
                        date_as_text: dateAsTextArray,
                        date: dateTimestampArray,
                     }),
                  },
               );

               if (!response.ok) {
                  throw new Error("Booking confirmation failed");
               }

               const result = await response.json();
               if (
                  typeof tatari !== "undefined" &&
                  typeof tatari.purchase === "function"
               ) {
                  const tatariInfo = {
                     total: result.response.total,
                     currency: result.response.currency,
                     orderId: result.response.orderId,
                     items: [
                        {
                           name: result.response.name,
                           price: result.response.total,
                           quantity: result.response.quantity,
                           productId: result.response.productId,
                           category: result.response.category,
                        },
                     ],
                     newPurchase: true,
                  };
                  tatari.purchase(tatariInfo);
               }

               // Show success message and redirect
               toastMessage.textContent = "Booking confirmed successfully!";
               toast.show();
               clearInterval(dotInterval);
               setTimeout(() => {
                  window.location.href = "/booking-confirmation";
               }, 2000);
            } catch (error) {
               console.error("Booking error:", error);
               toastMessage.textContent =
                  "Failed to confirm booking. Please try again.";
               toast.show();

               // Restore button state
               clearInterval(dotInterval);
               bookBtn.textContent = originalText;
               bookBtn.style.pointerEvents = "";
               bookBtn.style.opacity = "";
            }
         });

      // Update UI
      const firstLeg = dataSet.flightlegs[0];
      const legDateTime = formatDate(
         dateArray[0] || firstLeg.date_as_text1_text,
      );

      // Update header
      document.querySelector(".pl_init_right_heading").innerHTML = `
      <h3>${firstLeg.mobile_app_from_airport_name_short_text} to ${firstLeg.mobile_app_to_airport_name_short_text}</h3>
      <p class="para leg_count">${dataSet.way}, Entire Aircraft, ${firstLeg.pax1_number} Passengers</p>
    `;

      // Update leg details
      document.querySelector(".pl_init_right_leg").innerHTML = `
      <div class="pl_init_leg_wrapper_left">
        <h4>${firstLeg.mobile_app_from_airport_name_short_text} 
            <img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/67e7b5b70a753debb86dd20c_arrow-.png" alt="" /> 
            ${firstLeg.mobile_app_to_airport_name_short_text}</h4>
        <p>Entire aircraft . ${firstLeg.pax1_number} PAX</p>
      </div>
      <div class="pl_init_leg_wrapper_right">
        <p>${legDateTime} 
           <img class="hello_arrow" src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/67e7c59b7974f8a933baa8ee_hello.png" alt="" />
        </p>
      </div>
    `;

      // Add click event listener after updating content
      document
         .querySelector(".pl_init_right_leg")
         .addEventListener("click", function () {
            document
               .querySelector(".pl_init_right_leg_flight")
               .classList.toggle("legActive");
            this.classList.toggle("cng_arrow");
         });

      // code block for extra
      if (
         dataSet.catering !== undefined ||
         dataSet.de_icinginsurance !== undefined ||
         dataSet.groundtransfers !== undefined ||
         dataSet.crowdsource !== undefined
      ) {
         document.querySelector(".pl_init_right_extra").innerHTML = `
    <div class="extra_wrapper">
      <h3>Extras</h3>
      <div class="extra_block">
        ${
           dataSet.catering
              ? `<div class="extra_item">
                 <p>Catering</p>
                 <p>$ ${Number(dataSet.catering).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                 })}</p>
               </div>`
              : `<div class="extra_item">
                 <p>Catering</p>
                 <p>No</p>
               </div>`
        }

        ${
           dataSet.de_icinginsurance
              ? `<div class="extra_item">
                 <p>De-icing Insurance</p>
                 <p>$ ${Number(dataSet.de_icinginsurance).toLocaleString(
                    "en-US",
                    {
                       minimumFractionDigits: 2,
                       maximumFractionDigits: 2,
                    },
                 )}</p>
               </div>`
              : `<div class="extra_item">
                 <p>De-icing Insurance</p>
                 <p>No</p>
               </div>`
        }

        ${
           dataSet.groundtransfers
              ? `<div class="extra_item">
                 <p>Ground Transfers</p>
                 <p>$ ${Number(dataSet.groundtransfers).toLocaleString(
                    "en-US",
                    {
                       minimumFractionDigits: 2,
                       maximumFractionDigits: 2,
                    },
                 )}</p>
               </div>`
              : `<div class="extra_item">
                 <p>Ground Transfers</p>
                 <p>No</p>
               </div>`
        }

        ${
           dataSet.crowdsource !== undefined
              ? `<div class="extra_item">
                 <p>Crowdsource</p>
                 <p>${dataSet.crowdsource}</p>
               </div>`
              : ""
        }
      </div>
    </div>
  `;
      } else {
         // If no extras data, hide the extras section
         document.querySelector(".pl_init_right_extra").innerHTML = "";
      }

      // Update total
      document.querySelector(".pl_init_right_total").innerHTML = `
      <div class="pltotal_wrap">
        <div class="pltotal_wrap_left">
          <h3>Total</h3>
        </div>
        <div class="pltotal_wrap_right">
          <p>$ <span class="totalp">${formatPrice(dataSet.total_price)}</span></p>
          <span>all inclusive with tax</span>
        </div>
      </div>
    `;

      // Add checkbox price calculation after total price element is created
      const radioDivs = document.querySelectorAll(".resv_inp_bradio");
      const totalPElement = document.querySelector(".totalp");
      let currentTotal =
         parseFloat(totalPElement.textContent.replace(/,/g, "")) || 0;

      // Track selected prices
      let selectedPrices = new Map();

      radioDivs.forEach((div) => {
         div.addEventListener("click", function () {
            const priceStr = div.getAttribute("data-price");
            const price = parseFloat(priceStr);

            if (isNaN(price)) {
               console.warn("Invalid price value:", priceStr);
               return;
            }

            if (div.classList.contains("selected")) {
               // Remove selection
               div.classList.remove("selected");
               currentTotal -= price;
               selectedPrices.delete(div);
               const hours = div.getAttribute("data-hours");
               if (hours === "fiftyHours") fiftyHours = "yes";
               if (hours === "hundredHours") hundredHours = "yes";
               if (hours === "twohundredHours") twohundredHours = "yes";
               if (hours === "unlimited") unlimited = "yes";
            } else {
               // Add selection
               div.classList.add("selected");
               currentTotal += price;
               selectedPrices.set(div, price);
            }

            // Update total display with proper formatting
            totalPElement.textContent = currentTotal.toLocaleString("en-US", {
               minimumFractionDigits: 2,
               maximumFractionDigits: 2,
            });
         });
      });

      // Update flight legs list
      const roundLeg = dataSet.flightlegs
         .map((leg, index) => {
            return `
        <div class="leg_main-wrapper">
          <div class="leg_item_wrapper small_leg">
            <div class="pl_leg_details">
              <div class="pl_leg_left">
                <div class="pl_lgdestination">
                  <div class="pllg_left_time">
                    <p>${timeArray[index] || "12:00 AM"}</p>
                  </div>
                  <div class="pllg_left_place">
                    <div class="pllg_left_place_wrapper">
                      <p>${leg.mobile_app_from_airport_name_short_text || ""} ${leg.mobile_app_from_city_text_text || ""} ${leg.mobile_app_from_airport_icao_code_text || ""} / ${leg.mobile_app_from_airport_iata_code_text || ""} / ${leg.mobile_app_from_airport_faa_code_text || ""} - ${leg.mobile_app_to_airport_name_short_text || ""} ${leg.mobile_app_to_city_text_text || ""} ${leg.mobile_app_to_airport_icao_code_text || ""} / ${leg.mobile_app_to_airport_iata_code_text || ""} / ${leg.mobile_app_to_airport_faa_code_text || ""}</p>
                      <p class="para flyingjettly only_jettly">Jettly</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="pl_leg_right">
                <div class="wifi_img white_wifi_img">
                  <img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/67e672adefa14cdd32ff5653_wifi.png" alt="wifi img" />
                </div>
                <div class="wifi_para wifi_text">
                  <p>Wi-Fi likely available Plane type Light Jet Whole aircraft charter</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
         })
         .join("");

      document.querySelector(".pl_init_right_leg_flight").innerHTML = roundLeg;

      // Update flight legs in left section
      const legFlightHtml = dataSet.flightlegs
         .map((leg, index) => {
            const date = parseLocalDate(
               dateArray[index] || leg.date_as_text1_text,
            );
            const formattedDate = date.toLocaleDateString("en-US", {
               weekday: "short",
               month: "long",
               day: "numeric",
               year: "numeric",
            });

            const day = date.getDate();
            const legDateTime = formattedDate.replace(
               day,
               `${day}${getOrdinalSuffix(day)}`,
            );

            return `
        <div class="leg_item_wrapper">
           <div class="pl_init_heading">
              <div class="pl_init_heading_icon">
                 <img
                    src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/67b074759fa12985d1f61ce2_plan_icon.png"
                    loading="lazy"
                    alt=""
                    class="pl_init_heading_img"
                 />
              </div>
              <p class="pl_init_h3">${legDateTime}, ${timeArray[index] || "12:00 AM"}</p>
           </div>
           <div class="pl_leg_details">
              <div class="pl_leg_left">
                <div class="pl_lgdestination leftborderele">
                  <div class="pllg_left_time leftTime_option">
                    <p>${timeArray[index] || "12:00 AM"} </p>
                  </div>
                  <div class="pllg_left_place">
                    <div class="pllg_left_place_wrapper">
                      <p>${leg.mobile_app_from_airport_name_short_text || ""} ${leg.mobile_app_from_city_text_text || ""} ${leg.mobile_app_from_airport_icao_code_text || ""} / ${leg.mobile_app_from_airport_iata_code_text || ""} / ${leg.mobile_app_from_airport_faa_code_text || ""} </p>
                      <p class="para flyingjettly">Flying with Jettly</p>
                    </div>
                    <div class="pllg_left_place_wrapper">
                      <p>${leg.mobile_app_to_airport_name_short_text || ""} ${leg.mobile_app_to_city_text_text || ""} ${leg.mobile_app_to_airport_icao_code_text || ""} / ${leg.mobile_app_to_airport_iata_code_text || ""} / ${leg.mobile_app_to_airport_faa_code_text || ""}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="pl_leg_right">
               <div class="wifi_img">
                  <img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/67e672adefa14cdd32ff5653_wifi.png" alt="wifi img" />
               </div>
               <div class="wifi_para">
                <p>Wi-Fi likely available Plane type Light Jet Whole aircraft charter</p>
               </div>
              </div>
           </div>
        </div>
      `;
         })
         .join("");

      document.querySelector(".pl_init_left").innerHTML = legFlightHtml;

      // Update flight legs list
      const flightLegsList = dataSet.flightlegs
         .map((leg, index) => {
            const date = parseLocalDate(
               dateArray[index] || leg.date_as_text1_text,
            );
            const formattedDate = date.toLocaleDateString("en-US", {
               weekday: "short",
               month: "long",
               day: "numeric",
               year: "numeric",
            });

            const day = date.getDate();
            const legDateTime = formattedDate.replace(
               day,
               `${day}${getOrdinalSuffix(day)}`,
            );

            return `
        <p class="flight_details para mt1rem">${leg.mobile_app_from_city_text_text} to ${leg.mobile_app_to_city_text_text} ${legDateTime}, ${timeArray[index] || "12:00 AM"}, entire aircraft, ${leg.pax1_number} passengers <span>|</span></p>
      `;
         })
         .join("");

      document.querySelector(".rv_leg_list").innerHTML = flightLegsList;

      // Check type and add appropriate cancellation policy
      const aircraftDetailsForPolicy = JSON.parse(
         sessionStorage.getItem("aircraft_details") || "{}",
      );

      const step5dropElement = document.querySelector(".new_step");
      if (step5dropElement) {
         let cancellationPolicyHTML = "";

         if (aircraftDetailsForPolicy.type === "market") {
            cancellationPolicyHTML = `
          <div class="avblock dblock"><h4 class="resv_details_cnt_heading tleft">Cancellation Policy:</h4></div>
          
          <div class="cl_policy"><p class="para policy_mb">Domestic itineraries 7 days to 72 hours from departure are subject to a flat $1000 cancellation fee, 72 hours to 48 hours are subject to a fee equal to 25% of the total charter price, 48 to 24 hours are subject to a fee equal to 50% of the total charter price, less than 24 hours are subject to a fee equal to 100% of the total charter price.</p><p class="para policy_mb">International itineraries 7 days to 72 hours from departure are subject to a flat $2,500 cancellation fee, 72 hours or less are subject to a fee equal to 100% of the total charter price. Peak days are subject to a 100% cancellation fee.</p><p class="para policy_mb">Jettly reserves the right to fulfill your booking on another aircraft model that is equivalent or greater in class and may adjust your departure time by +/- 1 hour.</p><p class="para policy_mb">No shows, failure to arrive at least 30 minutes prior to the departure time (unless otherwise approved by Jettly) in possession of valid government-issued identification, and failure to board the aircraft upon crew's instructions will be treated as a no show subject to a 100% cancellation penalty whereby you will be charged the full cost of the flight.</p><p class="para policy_mb">Jettly does not own or operate any aircraft. Jettly will act as your Authorized Agent in arranging this flight.</p></div>
        `;
         } else if (aircraftDetailsForPolicy.type === "instant") {
            cancellationPolicyHTML = `
          <div class="avblock dblock">
            <h4 class="resv_details_cnt_heading tleft">Cancellation Policy:</h4>
          </div>

          <div class="cl_policy">
            <p class="para policy_mb">
              Instant Book flights will be confirmed within 48 hours of booking.
              Aircraft and crew are automatically assigned based on operational
              feasibility and availability within the chosen Instant Book aircraft
              category (e.g., light jet). The specific aircraft models included in
              each category are outlined
              <a
                target="_blank"
                href="https://docs.google.com/spreadsheets/d/1ISu_vtM1WhFhCDHoyfiM_A1gu0O47m1INcsmKTdnJz0/edit?usp=sharing"
                >HERE</a
              >, ensuring there is no discrepancy regarding which models fall under
              which class. You will receive a full refund if your flight cannot be
              confirmed within 48 hours.
            </p>
            <p class="para policy_mb">
              Flight changes and cancellations are permitted, subject to the terms and
              conditions of the aircraft operator. Aircraft weight, balance, and
              runway performance restrictions may apply.
            </p>
            <p class="para policy_mb">
              Pets are allowed onboard Instant Book flights, subject to the terms and
              conditions of the aircraft operator. Failure to disclose pets in advance
              may result in additional cleaning fees.
            </p>
            <p class="para policy_mb">
              Jettly does not own or operate aircraft and acts solely as your
              Authorized Agent in arranging this flight.
            </p>
          </div>
        `;
         }

         if (cancellationPolicyHTML) {
            step5dropElement.innerHTML += cancellationPolicyHTML;
         }
      }

      if (loader) loader.style.display = "none";
   } catch (error) {
      if (loader) loader.style.display = "none";
      console.error(error);
      toastMessage.textContent = "Something wrong try to booking again!";
      toast.show();
   }
});

// Add event listeners to toggle classes
document.addEventListener("DOMContentLoaded", function () {
   const toastElement = document.getElementById("notificationToast");
   const toastMessage = document.getElementById("toastMessage");
   const toast = new Toast(toastElement);

   const headings = document.querySelectorAll(".resv_details_heading");

   headings.forEach((heading) => {
      heading.addEventListener("click", function () {
         this.classList.toggle("active-heading");

         const detailsContent = this.nextElementSibling;
         if (
            detailsContent &&
            detailsContent.classList.contains("part_block")
         ) {
            detailsContent.classList.toggle("active-content");
         }
      });
   });

   document
      .querySelector("a.adult-booking")
      .addEventListener("click", function (e) {
         e.preventDefault();

         const requiredFields = [
            { id: "First_name", label: "First Name" },
            { id: "lastname", label: "Last Name" },
            { id: "bod", label: "Date of Birth" },
            { id: "emailaddress-2", label: "Email Address" },
            { id: "phonenumber", label: "Phone Number" },
            { id: "country", label: "Nationality" },
         ];

         const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
         const phonePattern = /^[0-9]+$/;

         let errorMessages = [];
         let emailValue = "";
         let phoneValue = "";

         requiredFields.forEach((field) => {
            const element = document.getElementById(field.id);
            const value = element ? element.value.trim() : "";

            if (!value) {
               errorMessages.push(field.label);
            }

            if (field.id === "emailaddress-2") {
               emailValue = value;
            }

            if (field.id === "phonenumber") {
               phoneValue = value;
            }
         });

         // Gender check
         const maleRadio = document.getElementById("Male");
         const femaleRadio = document.getElementById("Female");

         if (
            (!maleRadio || !maleRadio.checked) &&
            (!femaleRadio || !femaleRadio.checked)
         ) {
            errorMessages.push("Gender");
         }

         // Show required field errors first
         if (errorMessages.length > 0) {
            toastMessage.textContent =
               "You must fill: " + errorMessages.join(", ");
            toast.show();
            return;
         }

         // Separate email format validation
         if (!emailPattern.test(emailValue)) {
            toastMessage.textContent = "Enter a valid email address.";
            toast.show();
            return;
         }

         // Separate phone format validation
         if (!phonePattern.test(phoneValue)) {
            toastMessage.textContent = "Enter a valid phone number.";
            toast.show();
            return;
         }

         // Proceed to next step
         document
            .querySelector(".tv_heading")
            .classList.remove("active-heading");
         document.querySelector(".tv_cnt").classList.remove("active-content");
         document.querySelector(".cn2heading").classList.add("active-heading");
         document
            .querySelector(".cnt2_content")
            .classList.add("active-content");
      });

   document
      .querySelector(".cnt2_continue")
      .addEventListener("click", function () {
         document
            .querySelector(".cn2heading")
            .classList.remove("active-heading");
         document
            .querySelector(".cnt2_content")
            .classList.remove("active-content");
         document
            .querySelector(".payment_heading")
            .classList.add("active-heading");
         document
            .querySelector(".payment_part")
            .classList.add("active-content");
      });

   document
      .querySelector(".cd_pay_btn")
      .addEventListener("click", function (e) {
         e.preventDefault();

         const cardBillingRequiredFields = [
            // Card details
            { id: "Name-On-Card", label: "Name On Card" },
            { id: "Card-Number", label: "Card Number" },
            { id: "expdate", label: "Exp Date" },
            { id: "CVV", label: "CVV" },

            // Billing details
            { id: "BFirst-Name-2", label: "Billing First Name" },
            { id: "BLast-Name-2", label: "Billing Last Name" },
            { id: "Address-line", label: "Address Line 1" },
            { id: "zip", label: "Zip/Postal Code" },
            { id: "city", label: "City" },
            { id: "state", label: "State/Region" },
            { id: "countrylabel", label: "Country" },
         ];

         // Patterns for card details validation
         const cardNumberPattern = /^[0-9]+$/; // Only digits, no length restriction
         const expDatePattern = /^(0[1-9]|1[0-2])\/([0-9]{2})$/; // MM/YY format
         const cvvPattern = /^[0-9]+$/; // Only digits, no length restriction

         let emptyCardBillingFields = [];
         let invalidCardFields = [];

         // Check for empty fields
         cardBillingRequiredFields.forEach((field) => {
            const element = document.getElementById(field.id);
            if (
               element &&
               (element.value === null || element.value.trim() === "")
            ) {
               emptyCardBillingFields.push(field.label);
            }
         });

         // Card details validation
         const cardNumberValue = document
            .getElementById("Card-Number")
            .value.trim();
         const expDateValue = document.getElementById("expdate").value.trim();
         const cvvValue = document.getElementById("CVV").value.trim();

         if (cardNumberValue && !cardNumberPattern.test(cardNumberValue)) {
            invalidCardFields.push("Card Number");
         }

         if (expDateValue && !expDatePattern.test(expDateValue)) {
            invalidCardFields.push("Exp Date");
         }

         if (cvvValue && !cvvPattern.test(cvvValue)) {
            invalidCardFields.push("CVV");
         }

         // Show errors if any required or invalid fields are missing/incorrect
         if (emptyCardBillingFields.length > 0) {
            toastMessage.textContent =
               "You must fill: " + emptyCardBillingFields.join(", ");
            toast.show();
            return;
         }

         if (invalidCardFields.length > 0) {
            toastMessage.textContent =
               "Please enter valid values for: " + invalidCardFields.join(", ");
            toast.show();
            return;
         }

         // Proceed to the next step if all validation passes
         document
            .querySelector(".payment_heading")
            .classList.remove("active-heading");
         document
            .querySelector(".payment_part")
            .classList.remove("active-content");

         document
            .querySelector(".review_leg_heading")
            .classList.add("active-heading");
         document
            .querySelector(".review_leg_cnt")
            .classList.add("active-content");
      });

   //card & wire payment
   document.querySelectorAll(".hidden_cnt_btn").forEach((btn) => {
      btn.addEventListener("click", function () {
         document
            .querySelector(".payment_part")
            .classList.remove("active-content");
         document
            .querySelector(".payment_heading")
            .classList.remove("active-heading");

         document
            .querySelector(".review_leg_heading")
            .classList.add("active-heading");
         document
            .querySelector(".review_leg_cnt")
            .classList.add("active-content");
      });
   });

   // terms and condition
   document
      .querySelector(".leg_cnt_btn")
      .addEventListener("click", function () {
         document.querySelector(".tc_heading").classList.add("active-heading");
         document.querySelector(".tc_cnt").classList.add("active-content");

         document
            .querySelector(".review_leg_heading")
            .classList.remove("active-heading");
         document
            .querySelector(".review_leg_cnt")
            .classList.remove("active-content");
      });

   // accept termas and conditon
   document.querySelector(".tc_check").addEventListener("click", function () {
      this.classList.toggle("accepted");

      if (document.querySelector(".tc_check").classList.contains("accepted")) {
         document.querySelector(".final_btn").textContent = "BOOK NOW";
         document.querySelector(".final_btn").classList.add("allwo");
      } else {
         document.querySelector(".final_btn").textContent =
            "Accept term to proceed";
         document.querySelector(".final_btn").classList.remove("allwo");
      }
   });

   // ------- end of the dom content loaded-------
});
