// reservation.js
const toast = window.toast;
const toastMessage = document.getElementById("toastMessage");
document.addEventListener("DOMContentLoaded", async function () {
   const loader = document.querySelector(".loading_animation");
   if (loader) loader.style.display = "flex";

   try {
      // Get authToken from cookies
      const authToken = Cookies.get("authToken");

      if (!authToken) {
         if (loader) loader.style.display = "none";
         setTimeout(() => {
            window.location.href = "/";
         }, 2000);
         return;
      }

      // Get aircraft details from sessionStorage
      const aircraftDetails = JSON.parse(
         sessionStorage.getItem("aircraft_details") || "{}",
      );

      // Check if all required fields are present and valid
      if (
         !aircraftDetails.type ||
         !aircraftDetails.aircraftId ||
         !aircraftDetails.flightRequestId ||
         !aircraftDetails.fare_class ||
         !aircraftDetails.catering ||
         !aircraftDetails.groundtransfers ||
         !aircraftDetails.de_icinginsurance ||
         !aircraftDetails.crowdsource ||
         !aircraftDetails.way ||
         !aircraftDetails.dateAsText ||
         !aircraftDetails.timeAsText
      ) {
         if (loader) loader.style.display = "none";
         alert("Something went wrong. Please try again.");
         return;
      }

      // Way-specific validation
      const way = aircraftDetails.way.toLowerCase();
      if (
         way === "round trip" &&
         (!aircraftDetails.returnDateAsText ||
            !aircraftDetails.returnTimeAsText)
      ) {
         if (loader) loader.style.display = "none";
         alert("Something went wrong. Please try again.");
         return;
      }
      if (
         way === "multi-city" &&
         (!aircraftDetails.fromShortName || !aircraftDetails.toShortName)
      ) {
         if (loader) loader.style.display = "none";
         alert("Something went wrong. Please try again.");
         return;
      }

      // Helper: Convert 24h time to 12h format
      function time24to12(timeStr) {
         if (!timeStr) return "12:00 AM";
         const [h, m] = timeStr.split(":").map(Number);
         const period = h >= 12 ? "PM" : "AM";
         const hour12 = h % 12 || 12;
         return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
      }

      // Build date and time arrays from sessionStorage
      const wayLower = (aircraftDetails.way || "").toLowerCase();
      let dateArray = [];
      let timeArray = [];

      if (wayLower === "multi-city") {
         dateArray = Array.isArray(aircraftDetails.dateAsText)
            ? aircraftDetails.dateAsText
            : [aircraftDetails.dateAsText];
         const rawTimes = Array.isArray(aircraftDetails.timeAsText)
            ? aircraftDetails.timeAsText
            : [aircraftDetails.timeAsText];
         timeArray = rawTimes.map((t) => time24to12(t));
      } else if (wayLower === "round trip") {
         dateArray = [
            aircraftDetails.dateAsText,
            aircraftDetails.returnDateAsText,
         ];
         timeArray = [
            time24to12(aircraftDetails.timeAsText),
            time24to12(aircraftDetails.returnTimeAsText),
         ];
      } else {
         dateArray = [aircraftDetails.dateAsText];
         timeArray = [time24to12(aircraftDetails.timeAsText)];
      }

      // Continue with API call only if all essential details are available
      const response = await fetch(
         "https://operators-dashboard.bubbleapps.io/api/1.1/wf/book_now_button",
         {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
               Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
               type: aircraftDetails.type || "",
               aircraftid: aircraftDetails.aircraftId || "",
               flightrequestid: aircraftDetails.flightRequestId || "",
               fare_class: aircraftDetails.fare_class || "",
               catering: aircraftDetails.catering || "No",
               groundtransfers: aircraftDetails.groundtransfers || "No",
               de_icinginsurance: aircraftDetails.de_icinginsurance || "No",
               crowdsource: aircraftDetails.crowdsource || "No",
               way: aircraftDetails.way || "",
            }),
         },
      );

      const data = await response.json();
      const dataSet = data.response;
      let formatedDateTime;

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

      if (dataSet && dataSet.flightlegs) {
         document.querySelector(".trip_para").textContent = dataSet.way;

         const flightLegsHtml = dataSet.flightlegs
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

               // Add ordinal suffix to day
               const day = date.getDate();
               const suffix = (day) => {
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

               formatedDateTime = formattedDate.replace(
                  day,
                  `${day}${suffix(day)}`,
               );

               return `
         <p class="flight_details para">${leg.mobile_app_from_city_text_text} to ${leg.mobile_app_to_city_text_text} ${formatedDateTime}, ${timeArray[index] || "12:00 AM"}, entire aircraft, ${leg.pax1_number} passengers.</p>
       `;
            })
            .join("");

         document.querySelector(".flight_details_wrap").innerHTML =
            flightLegsHtml;

         // Create and legdetails in separate div
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

               // Add ordinal suffix to day
               const day = date.getDate();
               const suffix = (day) => {
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

               const legDateTime = formattedDate.replace(
                  day,
                  `${day}${suffix(day)}`,
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

         // html code for black box
         document.querySelector(".pl_init_right_heading").innerHTML = `
        <h3>${dataSet.flightlegs[0].mobile_app_from_airport_name_short_text} to ${dataSet.flightlegs[0].mobile_app_to_airport_name_short_text}</h3>
        <p class="para leg_count">${dataSet.way}, Entire Aircraft, ${dataSet.flightlegs[0].pax1_number} Passengers</p>
      `;

         // date calculation - parse date as local time to avoid timezone shifts
         const date = parseLocalDate(
            dateArray[0] || dataSet.flightlegs[0].date_as_text1_text,
         );

         const formattedDate = date.toLocaleDateString("en-US", {
            // Removed weekday option
            month: "long",
            day: "numeric",
            year: "numeric",
         });

         // Add ordinal suffix to day
         const day = date.getDate();
         const suffix = (day) => {
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

         const legDateTime = formattedDate.replace(day, `${day}${suffix(day)}`);

         document.querySelector(".pl_init_right_leg").innerHTML = `
        <div class="pl_init_leg_wrapper_left">
            <h4>${dataSet.flightlegs[0].mobile_app_from_airport_name_short_text} <img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/67e7b5b70a753debb86dd20c_arrow-.png" alt="" /> ${dataSet.flightlegs[0].mobile_app_to_airport_name_short_text}</h4>
            <p>Entire aircraft . ${dataSet.flightlegs[0].pax1_number} PAX</p>
          </div>
          <div class="pl_init_leg_wrapper_right">
            <p>${legDateTime} <img class="hello_arrow" src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/67e7c59b7974f8a933baa8ee_hello.png" alt="" /></p>
            
          </div>
      `;

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

         // code block for total
         document.querySelector(".pl_init_right_total").innerHTML = `
        <div class="pltotal_wrap">
          <div class="pltotal_wrap_left">
            <h3>Total</h3>
          </div>
          <div class="pltotal_wrap_right">
            <p>$ ${Number(dataSet.total_price).toLocaleString("en-US", {
               minimumFractionDigits: 2,
               maximumFractionDigits: 2,
            })}</p>
            <span>all inclusive with tax</span>
          </div>
        </div>
      `;

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
                          <p> ${leg.mobile_app_from_airport_name_short_text || ""} ${leg.mobile_app_from_city_text_text || ""} ${leg.mobile_app_from_airport_icao_code_text || ""} / ${leg.mobile_app_from_airport_iata_code_text || ""} / ${leg.mobile_app_from_airport_faa_code_text || ""} - ${leg.mobile_app_to_airport_name_short_text || ""} ${leg.mobile_app_to_city_text_text || ""} ${leg.mobile_app_to_airport_icao_code_text || ""} / ${leg.mobile_app_to_airport_iata_code_text || ""} / ${leg.mobile_app_to_airport_faa_code_text || ""}</p>

          <p class="para flyingjettly only_jettly">Jettly</p>
                        </div>

          <div class="pllg_left_place_wrapper">
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

         document.querySelector(".pl_init_right_leg_flight").innerHTML =
            roundLeg;
      }

      if (loader) loader.style.display = "none";

      if (!response.ok) {
         toastMessage.textContent = "Something wrong try to booking again!";
         toast.show();
      }
   } catch (error) {
      if (loader) loader.style.display = "none";
      console.error(error);
      toastMessage.textContent = "Something wrong try to booking again!";
      toast.show();
   }

   // Add click event listener for leg toggle functionality
   function setupLegToggleListener() {
      const legToggleBtn = document.querySelector(".pl_init_right_leg");
      const legFlight = document.querySelector(".pl_init_right_leg_flight");
      if (legToggleBtn && legFlight) {
         legToggleBtn.addEventListener("click", function () {
            legFlight.classList.toggle("legActive");
            this.classList.toggle("cng_arrow");
         });
      }
   }

   // Call it after initial render
   setupLegToggleListener();

   // Handle logout
   const logoutBtn = document.getElementById("logoutBtn");
   if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
         // Clear cookies
         Cookies.remove("userEmail");
         Cookies.remove("authToken");

         // Clear sessionStorage if aircraft details exist
         if (sessionStorage.getItem("aircraft_details")) {
            sessionStorage.removeItem("aircraft_details");
         }

         // Redirect to home page
         window.location.href = "/";
      });
   }
});
