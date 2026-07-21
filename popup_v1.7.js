/*
==============================================================
    ✅ Popup.js for jettly.com
    ✅ connect will in aircraft page (latest update)
==============================================================
*/

// code for displaying info from session storage in card of aircraft page start
// Global state variables for nearby checkbox
let oneWayFromNearby = false;
let oneWayToNearby = false;
let roundTripFromNearby = false;
let roundTripToNearby = false;

const flightData = JSON.parse(sessionStorage.getItem("storeData") || "{}");
// Helper function to format date
function formatDate(dateString) {
   if (!dateString) {
      return "Select Date";
   }
   const [year, month, day] = dateString.split("-");
   const date = new Date(year, month - 1, day);
   const options = { day: "numeric", month: "short", year: "numeric" };
   return date.toLocaleDateString("en-US", options);
}

// Helper function to create a flight card
function createFlightCard(fromName, toName, date, passengers) {
   const safeFrom = fromName ? fromName.toUpperCase() : "";
   const safeTo = toName ? toName.toUpperCase() : "";
   return `
          <div class="flight_card">
      <div class="flight_card_left">
        <p>${safeFrom} - ${safeTo}</p>
        <div class="flight_card_left_cnt">
          <div class="fcl_date">
            <div class="fcl_date_icon">
              <img
                src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/69297cf8959d73a72ae7e1c6_icon.png"
                alt=""
              />
            </div>
            <div class="fcl_date_text">
              <p>${formatDate(date)}</p>
            </div>
          </div>
          <div class="fcl_pax">
            <div class="fcl_pax_icon">
              <img
                src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/69297d656f3f170c84ba8db2_pax.png"
                alt=""
              />
            </div>
            <div class="fcl_pax_number">
              <p>${passengers} ${
                 parseInt(passengers) > 1 ? "Passengers" : "Passenger"
              }</p>
            </div>
          </div>
        </div>
      </div>
      <div class="flight_card_right">
        <img
          src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/69297db62af820959f72a1ed_filtetr.png"
          alt=""
        />
      </div>
    </div>       
        `;
}

// Check if data is array (multi-city) or single trip
const isMultiCity = Array.isArray(flightData.fromShortName);
const container = document.getElementById("flightContainer");

if (isMultiCity) {
   if (flightData.fromShortName && flightData.fromShortName.length > 0) {
      const lastIndex = flightData.fromShortName.length - 1;
      const fromName = flightData.fromShortName[lastIndex];
      const toName = flightData.toShortName[lastIndex];
      const date = flightData.dateAsText[lastIndex];
      const passengers = flightData.pax[lastIndex];

      if (fromName && toName) {
         container.innerHTML = createFlightCard(
            fromName,
            toName,
            date,
            passengers,
         );
      }
   }
} else {
   // Handle single trip data
   if (flightData.fromShortName && flightData.toShortName) {
      const cardHTML = createFlightCard(
         flightData.fromShortName,
         flightData.toShortName,
         flightData.dateAsText,
         flightData.pax || "0",
      );
      container.innerHTML = cardHTML;
   }
}

// code for displaying info from session storage in card of aircraft page end
// algolio search
// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", function () {
   // Algolia Search Implementation
   const searchClient = algoliasearch(
      "ZSPO7HB4MN",
      "2a3621a18dca4f1fb757e9ddaea72440",
   );
   const index = searchClient.initIndex("Airports");

   function displayRecentSearches(popupSelector) {
      const popup = document.querySelector(popupSelector);
      if (!popup) return;

      // Check if Multi-city tab is active
      const multiCityTab = document.getElementById("mstabmulticity");
      const isMultiCity =
         multiCityTab && multiCityTab.classList.contains("active");

      let recentSearchDiv = popup.querySelector(".recent_search");
      let signinDiv = popup.querySelector(".from_signin, .to_signin");

      if (isMultiCity) {
         if (recentSearchDiv) recentSearchDiv.remove();
         if (signinDiv) signinDiv.remove();
         return;
      }

      const userEmail = Cookies.get("userEmail");
      const authToken = Cookies.get("authToken");
      const isLoggedIn = userEmail && authToken;

      // Determine context (from or to)
      const isFrom = popup.classList.contains("from_popup");
      const signinClass = isFrom ? "from_signin" : "to_signin";

      if (!isLoggedIn) {
         // User is LOGGED OUT
         if (recentSearchDiv) {
            recentSearchDiv.remove();
         }
         if (!signinDiv) {
            const wrapper = popup.querySelector(
               ".from_popup_wrapper, .to_popup_wrapper",
            );
            if (wrapper) {
               const newSignin = document.createElement("div");
               newSignin.className = signinClass;
               newSignin.innerHTML = `
            <p>Sign in to view your recent searches</p>
            <button type="button">SIGN IN</button>
          `;
               wrapper.appendChild(newSignin);
            }
         }
         return;
      }

      // User is LOGGED IN
      if (signinDiv) {
         signinDiv.remove();
      }

      if (!recentSearchDiv) {
         // Recreate Recent Search if missing
         const inputCnt = popup.querySelector(
            ".from_pop_inp_cnt, .to_pop_inp_cnt",
         );
         if (inputCnt) {
            const newDiv = document.createElement("div");
            newDiv.className = "recent_search";
            newDiv.innerHTML = `
            <div class="recent_search_heading">
              <p>Recent Searches</p>
              <button>CLEAR</button>
            </div>
            <div class="recent_search_wrapper"></div>
      `;
            inputCnt.insertAdjacentElement("afterend", newDiv);
            recentSearchDiv = newDiv;
         } else {
            return;
         }
      }

      const container = recentSearchDiv.querySelector(".recent_search_wrapper");
      if (!container) return;

      const recentSearches = JSON.parse(
         localStorage.getItem("recentSearch") || "[]",
      );

      // Filter based on active tab
      const oneWayTab = document.getElementById("mstaboneway");
      const isOneWay = oneWayTab && oneWayTab.classList.contains("active");

      const roundTripTab = document.getElementById("mstabroundtrip");
      const isRoundTrip =
         roundTripTab && roundTripTab.classList.contains("active");

      let filteredSearches = [];
      if (isOneWay) {
         filteredSearches = recentSearches.filter(
            (item) => item.way === "one way",
         );
      } else if (isRoundTrip) {
         filteredSearches = recentSearches.filter(
            (item) => item.way === "round trip",
         );
      } else {
         filteredSearches = recentSearches;
      }

      if (filteredSearches.length === 0) {
         container.innerHTML = "<p class='no_result'>No recent searches</p>";
         return;
      }

      const formatRecentDate = (dateString) => {
         if (!dateString) return "";
         const [year, month, day] = dateString.split("-");
         const date = new Date(year, month - 1, day);
         return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
         });
      };

      const formatLocationName = (name) => {
         if (!name) return "";
         return name.split("(")[0].trim();
      };

      container.innerHTML = filteredSearches
         .map((item, index) => {
            const dateDisplay = item.returnDateAsText
               ? `${formatRecentDate(item.dateAsText)} - ${formatRecentDate(
                    item.returnDateAsText,
                 )}`
               : `${formatRecentDate(item.dateAsText)}`;

            return `
        <div class="recent_search_item" data-index="${index}">
          <div class="recent_sc_item_left">
            <img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/69299269ccb9fc2ec39c70ca_plan_icon1.png" alt="" />
            <div class="recent_sc_item_right">
              <div class="rcs_place">
                <p>${formatLocationName(item.formIdInput)} (${
                   item.fromShortName
                }) - ${formatLocationName(item.toIdInput)} (${item.toShortName})</p>
                <p>${dateDisplay}</p>
              </div>
            </div>
          </div>
        </div>
      `;
         })
         .join("");
   }

   // Listen for login success event
   window.addEventListener("loginSuccess", function () {
      displayRecentSearches(".from_popup");
      displayRecentSearches(".to_popup");
   });

   // Handle Recent Search Item Click
   document.addEventListener("click", function (e) {
      const item = e.target.closest(".recent_search_item");
      if (item) {
         const index = parseInt(item.getAttribute("data-index"));
         const recentSearches = JSON.parse(
            localStorage.getItem("recentSearch") || "[]",
         );

         // Filter based on active tab to match display logic
         const oneWayTab = document.getElementById("mstaboneway");
         const isOneWay = oneWayTab && oneWayTab.classList.contains("active");

         const roundTripTab = document.getElementById("mstabroundtrip");
         const isRoundTrip =
            roundTripTab && roundTripTab.classList.contains("active");

         let filteredSearches = [];
         if (isOneWay) {
            filteredSearches = recentSearches.filter(
               (item) => item.way === "one way",
            );
         } else if (isRoundTrip) {
            filteredSearches = recentSearches.filter(
               (item) => item.way === "round trip",
            );
         } else {
            filteredSearches = recentSearches;
         }

         const data = filteredSearches[index];

         if (data) {
            const formatDate = (dateString) => {
               const [year, month, day] = dateString.split("-");
               const date = new Date(year, month - 1, day);
               const options = {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
               };
               return date.toLocaleDateString("en-GB", options);
            };

            if (data.way === "one way") {
               // Populate One Way Fields
               const owFromAirpName = document.querySelector(".owfaname");
               const owFromAirpId = document.querySelector(".owfaid");
               const owToAirpName = document.querySelector(".owtaname");
               const owToAirpId = document.querySelector(".owtaid");
               const owFormatedDate = document.querySelector(".owdateformated");
               const owDateAsText = document.querySelector(".owdateastext");
               const owPax = document.querySelector(".owpax");
               const owFromAirpShortName = document.querySelector(".owfashort");
               const owToAirpShortName = document.querySelector(".owtashort");

               if (owFromAirpName && data.formIdInput) {
                  owFromAirpName.innerHTML = `<span class="light_font">${data.formIdInput}</span> <span>(${data.fromShortName})</span>`;
               }
               if (owFromAirpId && data.fromId)
                  owFromAirpId.textContent = data.fromId;
               if (owFromAirpShortName && data.fromShortName)
                  owFromAirpShortName.textContent = data.fromShortName;

               if (owToAirpName && data.toIdInput) {
                  owToAirpName.innerHTML = `<span class="light_font">${data.toIdInput}</span> <span>(${data.toShortName})</span>`;
               }
               if (owToAirpId && data.toId) owToAirpId.textContent = data.toId;
               if (owToAirpShortName && data.toShortName)
                  owToAirpShortName.textContent = data.toShortName;

               if (owDateAsText && data.dateAsText)
                  owDateAsText.textContent = data.dateAsText;
               if (owFormatedDate && data.dateAsText) {
                  owFormatedDate.textContent = formatDate(data.dateAsText);
               }

               if (owPax && data.pax) {
                  owPax.innerHTML = `<span class="paxcount">${
                     data.pax
                  }</span> ${
                     parseInt(data.pax) > 1 ? "Passengers" : "Passenger"
                  }`;
                  if (Array.isArray(data.paxBreakdown)) {
                     owPax.setAttribute(
                        "data-pax-breakdown",
                        JSON.stringify(data.paxBreakdown),
                     );
                  } else if (data.pax) {
                     // If no breakdown, set all to 0 except adults
                     const breakdown = [parseInt(data.pax) || 0, 0, 0, 0, 0, 0];
                     owPax.setAttribute(
                        "data-pax-breakdown",
                        JSON.stringify(breakdown),
                     );
                  } else {
                     owPax.removeAttribute("data-pax-breakdown");
                  }
               }
            } else if (data.way === "round trip") {
               // Populate Round Trip Fields
               const rtFromAirpName = document.querySelector(".rwfaname");
               const rtFromAirpId = document.querySelector(".rwfaid");
               const rtToAirpName = document.querySelector(".rwtaname");
               const rtToAirpId = document.querySelector(".rwtaid");
               const rtFormatedDate = document.querySelector(".rwdateformated");
               const rtDateAsText = document.querySelector(".rwdateastext");
               const rtReturnDate = document.querySelector(".rwreturndate");
               const rtPax = document.querySelector(".rwpax");
               const rwFromAirpShortName = document.querySelector(".rwfashort");
               const rwToAirpShortName = document.querySelector(".rwtashort");

               if (rtFromAirpName && data.formIdInput) {
                  rtFromAirpName.innerHTML = `<span class="light_font">${data.formIdInput}</span> <span>(${data.fromShortName})</span>`;
               }
               if (rtFromAirpId && data.fromId)
                  rtFromAirpId.textContent = data.fromId;
               if (rwFromAirpShortName && data.fromShortName)
                  rwFromAirpShortName.textContent = data.fromShortName;

               if (rtToAirpName && data.toIdInput) {
                  rtToAirpName.innerHTML = `<span class="light_font">${data.toIdInput}</span> <span>(${data.toShortName})</span>`;
               }
               if (rtToAirpId && data.toId) rtToAirpId.textContent = data.toId;
               if (rwToAirpShortName && data.toShortName)
                  rwToAirpShortName.textContent = data.toShortName;

               if (rtDateAsText && data.dateAsText)
                  rtDateAsText.textContent = data.dateAsText;
               if (rtReturnDate && data.returnDateAsText)
                  rtReturnDate.textContent = data.returnDateAsText;

               if (rtFormatedDate && data.dateAsText && data.returnDateAsText) {
                  rtFormatedDate.textContent = `${formatDate(
                     data.dateAsText,
                  )} - ${formatDate(data.returnDateAsText)}`;
               }

               if (rtPax && data.pax) {
                  rtPax.innerHTML = `<span class="paxcount">${
                     data.pax
                  }</span> ${
                     parseInt(data.pax) > 1 ? "Passengers" : "Passenger"
                  }`;
                  if (Array.isArray(data.paxBreakdown)) {
                     rtPax.setAttribute(
                        "data-pax-breakdown",
                        JSON.stringify(data.paxBreakdown),
                     );
                  } else if (data.pax) {
                     // If no breakdown, set all to 0 except adults
                     const breakdown = [parseInt(data.pax) || 0, 0, 0, 0, 0, 0];
                     rtPax.setAttribute(
                        "data-pax-breakdown",
                        JSON.stringify(breakdown),
                     );
                  } else {
                     rtPax.removeAttribute("data-pax-breakdown");
                  }
               }
            }

            // Close Popups
            const fromPopup = document.querySelector(".from_popup");
            const toPopup = document.querySelector(".to_popup");
            if (fromPopup) fromPopup.style.display = "none";
            if (toPopup) toPopup.style.display = "none";
         }
      }
   });

   // Clear recent searches functionality (Delegated)
   document.addEventListener("click", function (e) {
      if (e.target.matches(".recent_search_heading button")) {
         localStorage.removeItem("recentSearch");
         displayRecentSearches(".from_popup");
         displayRecentSearches(".to_popup");
      }
   });

   // Handle Sign In Button Click
   document.addEventListener("click", function (e) {
      if (e.target.matches(".from_signin button, .to_signin button")) {
         const loginForm = document.getElementById("loginForm");
         const authFormsWrapper = document.getElementById("authFormsWrapper");

         if (authFormsWrapper) authFormsWrapper.style.display = "block";
         if (loginForm) loginForm.style.display = "flex";
      }
   });

   function debounce(func, delay) {
      let timeout;
      return function (...args) {
         const context = this;
         clearTimeout(timeout);
         timeout = setTimeout(() => func.apply(context, args), delay);
      };
   }

   function escapeHTML(str) {
      const div = document.createElement("div");
      div.appendChild(document.createTextNode(str));
      return div.innerHTML;
   }

   const handleInput = debounce(function (event) {
      const input = event.target;
      if (
         !input.classList.contains("algolio_input_from") &&
         !input.classList.contains("algolio_input_to")
      )
         return;
      const query = input.value.trim();
      const algolioWrapper = input.closest(".algolio_wrapper");

      // Determine which results container to use
      let resultsContainer;
      if (input.classList.contains("algolio_input_from")) {
         resultsContainer = document.querySelector(".pop_search-results_from");
      } else if (input.classList.contains("algolio_input_to")) {
         resultsContainer = document.querySelector(".pop_search-results_to");
      }

      if (!resultsContainer) return;

      if (query.length === 0) {
         resultsContainer.innerHTML = "";
         return;
      }

      // Perform Algolia search
      index
         .search(query)
         .then(({ hits }) => {
            if (hits.length > 0) {
               resultsContainer.innerHTML = hits
                  .map(
                     (hit) =>
                        `<div class="port" tabindex="0">
                  <div class="from_pop_result_block">
                    <div class="form_pop_left">
                     <img
                      src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/69299269ccb9fc2ec39c70ca_plan_icon1.png"
                      alt="Location Icon"
                    />
                    <p class="emfieldname">${escapeHTML(hit["All Fields"])}</p>
                    </div>
                    <div class="form_pop_right">
                      <p class="uniqueid">${escapeHTML(hit["unique id"])}</p>
                      <p class="shortcode">${escapeHTML(
                         hit["AirportNameShort"],
                      )}</p>
                    </div>
                  </div>
                </div>`,
                  )
                  .join("");
            } else {
               resultsContainer.innerHTML = "<p>No results found.</p>";
            }
         })
         .catch((err) => {
            console.error("Algolia search error:", err);
            resultsContainer.innerHTML = "<p>Error fetching results.</p>";
         });
   }, 300);

   // Function to handle click events on search results
   function handleClick(event) {
      const portElement = event.target.closest(".port");
      if (portElement) {
         const emfieldnameEl = portElement.querySelector(".emfieldname");
         const uniqueidEl = portElement.querySelector(".uniqueid");
         const shortcodeEl = portElement.querySelector(".shortcode");

         // If any required element is missing, this might be a result from another script (like fix.js)
         // So we simply return and let the other script handle it.
         if (!emfieldnameEl || !uniqueidEl || !shortcodeEl) return;

         const emfieldname = `<span class="light_font">${emfieldnameEl.textContent}</span> <span>(${shortcodeEl.textContent})</span>`;
         const uniqueid = uniqueidEl.textContent;
         const shortcode = shortcodeEl.textContent;

         // Fill data based on which modal is open
         if (window.currentClickedPopup) {
            const nameElement = window.currentClickedPopup.querySelector(
               ".fromairportname, .toairportname",
            );
            const idElement = window.currentClickedPopup.querySelector(
               ".fromairportid, .toairportid",
            );
            const shortcodeElement = window.currentClickedPopup.querySelector(
               ".fromairportshortcode, .toairportshortcode",
            );

            if (nameElement) nameElement.innerHTML = emfieldname;
            if (idElement) idElement.textContent = uniqueid;
            if (shortcodeElement) shortcodeElement.textContent = shortcode;
         }

         // Reset input value, clear results, and hide the appropriate modal
         const fromPopup = document.querySelector(".from_popup");
         const toPopup = document.querySelector(".to_popup");

         if (fromPopup && fromPopup.style.display === "block") {
            const fromInput = document.querySelector(".algolio_input_from");
            const fromResults = document.querySelector(
               ".pop_search-results_from",
            );
            if (fromInput) fromInput.value = "";
            if (fromResults) fromResults.innerHTML = "";
            fromPopup.style.display = "none";
         } else if (toPopup && toPopup.style.display === "block") {
            const toInput = document.querySelector(".algolio_input_to");
            const toResults = document.querySelector(".pop_search-results_to");
            if (toInput) toInput.value = "";
            if (toResults) toResults.innerHTML = "";
            toPopup.style.display = "none";
         }
      }
   }

   // Function to attach event listeners to a given .algolio_wrapper
   function attachListeners(algolioWrapper) {
      algolioWrapper.addEventListener("input", handleInput);
      algolioWrapper.addEventListener("focusout", function (event) {
         setTimeout(() => {
            const relatedTarget = event.relatedTarget;

            if (!relatedTarget || !algolioWrapper.contains(relatedTarget)) {
               const allResults =
                  algolioWrapper.querySelectorAll(".search-results");
               allResults.forEach((resultsContainer) => {
                  resultsContainer.innerHTML = "";
               });
            }
         }, 100);
      });
   }

   // Select all existing .algolio_wrapper elements and attach listeners
   const algolioWrappers = document.querySelectorAll(".algolio_wrapper");
   algolioWrappers.forEach(attachListeners);

   // Add click listener to the search results container (outside algolio_wrapper)
   document.addEventListener("click", handleClick);

   // Hide search results when clicking outside
   document.addEventListener("click", function (event) {
      const resultsContainer = document.querySelector(".pop_search-results");
      const algolioInput = document.querySelector(".algolio_input");

      // Check if click is outside both input and results
      if (resultsContainer && algolioInput) {
         const isClickInside =
            resultsContainer.contains(event.target) ||
            algolioInput.contains(event.target) ||
            event.target.classList.contains("algolio_input");

         if (!isClickInside) {
            resultsContainer.innerHTML = "";
         }
      }
   });

   // Show from_popup when clicking on .frompopup (using event delegation)
   document.addEventListener("click", function (e) {
      const frompopup = e.target.closest(".frompopup");
      if (frompopup) {
         window.currentClickedPopup = frompopup;
         document.querySelector(".from_popup").style.display = "block";
         displayRecentSearches(".from_popup");

         // Manage nearby checkbox injection
         const isMultiCity = document
            .getElementById("mstabmulticity")
            .classList.contains("active");
         const isOneWay = document
            .getElementById("mstaboneway")
            .classList.contains("active");
         const isRoundTrip = document
            .getElementById("mstabroundtrip")
            .classList.contains("active");

         const fromInputBox = document.querySelector(".from_input_box");
         let existingCheckbox = document.querySelector(".from_near_checkbox");

         if (!isMultiCity) {
            if (!existingCheckbox && fromInputBox) {
               const checkboxHTML = `
                        <div class="from_near_checkbox">
                          <p>Include Nearby Airports</p>
                          <div class="toggle-switcher-container">
                            <label class="toggle-switcher">
                              <input type="checkbox" />
                              <span class="slider"></span>
                            </label>
                          </div>
                        </div>`;
               fromInputBox.insertAdjacentHTML("afterend", checkboxHTML);
               existingCheckbox = document.querySelector(".from_near_checkbox");
            }

            // Sync state with global variables
            if (existingCheckbox) {
               const checkbox = existingCheckbox.querySelector(
                  "input[type='checkbox']",
               );

               // Remove old listeners to avoid stacking
               const newCheckbox = checkbox.cloneNode(true);
               checkbox.parentNode.replaceChild(newCheckbox, checkbox);

               // Set initial state based on active tab
               if (isOneWay) {
                  newCheckbox.checked = oneWayFromNearby;
                  newCheckbox.addEventListener("change", () => {
                     oneWayFromNearby = newCheckbox.checked;
                  });
               } else if (isRoundTrip) {
                  newCheckbox.checked = roundTripFromNearby;
                  newCheckbox.addEventListener("change", () => {
                     roundTripFromNearby = newCheckbox.checked;
                  });
               }
            }
         } else {
            if (existingCheckbox) {
               existingCheckbox.remove();
            }
         }

         // Clear the search input
         const algolioInput = document.querySelector(".algolio_input_from");
         if (algolioInput) algolioInput.value = "";
      }
   });

   // Show to_popup when clicking on .topopup (using event delegation)
   document.addEventListener("click", function (e) {
      const topopup = e.target.closest(".topopup");
      if (topopup) {
         window.currentClickedPopup = topopup;
         document.querySelector(".to_popup").style.display = "block";
         displayRecentSearches(".to_popup");

         // Manage nearby checkbox injection
         const isMultiCity = document
            .getElementById("mstabmulticity")
            .classList.contains("active");
         const isOneWay = document
            .getElementById("mstaboneway")
            .classList.contains("active");
         const isRoundTrip = document
            .getElementById("mstabroundtrip")
            .classList.contains("active");

         const toInputBox = document.querySelector(".to_input_box");
         let existingCheckbox = document.querySelector(".to_near_checkbox");

         if (!isMultiCity) {
            if (!existingCheckbox && toInputBox) {
               const checkboxHTML = `
                        <div class="to_near_checkbox">
                          <p>Include Nearby Airports</p>
                          <div class="toggle-switcher-container">
                            <label class="toggle-switcher">
                              <input type="checkbox" />
                              <span class="slider"></span>
                            </label>
                          </div>
                        </div>`;
               toInputBox.insertAdjacentHTML("afterend", checkboxHTML);
               existingCheckbox = document.querySelector(".to_near_checkbox");
            }

            // Sync state with global variables
            if (existingCheckbox) {
               const checkbox = existingCheckbox.querySelector(
                  "input[type='checkbox']",
               );

               // Remove old listeners to avoid stacking
               const newCheckbox = checkbox.cloneNode(true);
               checkbox.parentNode.replaceChild(newCheckbox, checkbox);

               // Set initial state based on active tab
               if (isOneWay) {
                  newCheckbox.checked = oneWayToNearby;
                  newCheckbox.addEventListener("change", () => {
                     oneWayToNearby = newCheckbox.checked;
                  });
               } else if (isRoundTrip) {
                  newCheckbox.checked = roundTripToNearby;
                  newCheckbox.addEventListener("change", () => {
                     roundTripToNearby = newCheckbox.checked;
                  });
               }
            }
         } else {
            if (existingCheckbox) {
               existingCheckbox.remove();
            }
         }

         // Clear the search input
         const algolioInput = document.querySelector(".algolio_input_to");
         if (algolioInput) algolioInput.value = "";
      }
   });

   // Show date_popup when clicking on .datepopup (using event delegation)
   document.addEventListener("click", function (e) {
      const datepopup = e.target.closest(".datepopup");
      if (datepopup) {
         window.currentClickedPopup = datepopup;
         document.querySelector(".date_popup").style.display = "block";
      }
   });

   // Hide from_popup when clicking the close icon
   document
      .querySelector(".from_popup_header .msp_header_icon")
      .addEventListener("click", function () {
         document.querySelector(".from_popup").style.display = "none";
      });

   // Hide to_popup when clicking the close icon
   document
      .querySelector(".to_popup_header .msp_header_icon")
      .addEventListener("click", function () {
         document.querySelector(".to_popup").style.display = "none";
      });

   // Hide date_popup when clicking the close icon
   document
      .querySelector(".date_popup_header .msp_header_icon")
      .addEventListener("click", function () {
         document.querySelector(".date_popup").style.display = "none";
      });
}); // End DOMContentLoaded

// popup display code
const popupTigger = document.querySelector(".search_mobile_wrapper");
const popBoxOne = document.querySelector(".search_mobile_popup");

if (popupTigger && popBoxOne) {
   const crossPopup = popBoxOne.querySelector(".msp_header_icon");

   popupTigger.addEventListener("click", function () {
      popBoxOne.style.display = "block";
      document.querySelector("body").style.overflow = "hidden";
   });

   if (crossPopup) {
      crossPopup.addEventListener("click", function () {
         popBoxOne.style.display = "none";
         document.querySelector("body").style.overflow = "auto";
      });
   }
}

// Select all tab buttons and content boxes
const tabItems = document.querySelectorAll(".ms_tab_item");
const tabContents = document.querySelectorAll(".ms_tab_cnt_item");

tabItems.forEach((tab) => {
   tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("data-item");

      // Remove active from all tabs
      tabItems.forEach((item) => item.classList.remove("active"));

      // Remove active from all tab contents
      tabContents.forEach((content) => content.classList.remove("active"));

      // Add active to clicked tab
      tab.classList.add("active");

      // Add active to matching content tab
      document.getElementById(targetId).classList.add("active");

      // Reset PAX counters to 0 when switching tabs
      document.querySelectorAll(".pax_count").forEach((span) => {
         span.textContent = "0";
      });
   });
});

//filling data from session storage
const getsessionDateSM = sessionStorage.getItem("storeData");
const getstoredDataSM = JSON.parse(getsessionDateSM);

if (!getstoredDataSM) {
   window.location.href = `/`;
}

// Set active tab based on session storage way
if (getstoredDataSM.way === "one way") {
   tabItems.forEach((item) => item.classList.remove("active"));
   tabContents.forEach((content) => content.classList.remove("active"));
   document.querySelector('[data-item="mstaboneway"]').classList.add("active");
   document.getElementById("mstaboneway").classList.add("active");
} else if (getstoredDataSM.way === "round trip") {
   tabItems.forEach((item) => item.classList.remove("active"));
   tabContents.forEach((content) => content.classList.remove("active"));
   document
      .querySelector('[data-item="mstabroundtrip"]')
      .classList.add("active");
   document.getElementById("mstabroundtrip").classList.add("active");
} else if (getstoredDataSM.way === "multi-city") {
   tabItems.forEach((item) => item.classList.remove("active"));
   tabContents.forEach((content) => content.classList.remove("active"));
   document
      .querySelector('[data-item="mstabmulticity"]')
      .classList.add("active");
   document.getElementById("mstabmulticity").classList.add("active");
}

function formatDate(dateString) {
   const [year, month, day] = dateString.split("-");
   const date = new Date(year, month - 1, day);
   const options = { day: "numeric", month: "short", year: "numeric" };
   return date.toLocaleDateString("en-GB", options);
}

// for one way
const owFromAirpName = document.querySelector(".owfaname");
const owFromAirpId = document.querySelector(".owfaid");
const owToAirpName = document.querySelector(".owtaname");
const owToAirpId = document.querySelector(".owtaid");
const owFormatedDate = document.querySelector(".owdateformated");
const owDateAsText = document.querySelector(".owdateastext");
const owPax = document.querySelector(".owpax");
const owFromAirpShortName = document.querySelector(".owfashort");
const owToAirpShortName = document.querySelector(".owtashort ");

function fillInputOneWay() {
   if (getstoredDataSM.formIdInput) {
      owFromAirpName.innerHTML = `<span class="light_font">${getstoredDataSM.formIdInput}</span> <span>(${getstoredDataSM.fromShortName})</span>`;
   }
   if (getstoredDataSM.toIdInput) {
      owToAirpName.innerHTML = `<span class="light_font">${getstoredDataSM.toIdInput}</span> <span>(${getstoredDataSM.toShortName})</span>`;
   }

   if (getstoredDataSM.fromId) {
      owFromAirpId.textContent = getstoredDataSM.fromId;
   }

   if (getstoredDataSM.toId) {
      owToAirpId.textContent = getstoredDataSM.toId;
   }
   if (getstoredDataSM.dateAsText) {
      owDateAsText.textContent = getstoredDataSM.dateAsText;
   }

   if (getstoredDataSM.dateAsText) {
      owFormatedDate.textContent = formatDate(getstoredDataSM.dateAsText);
   }

   if (getstoredDataSM.fromShortName) {
      owFromAirpShortName.textContent = getstoredDataSM.fromShortName;
   }

   if (getstoredDataSM.toShortName) {
      owToAirpShortName.textContent = getstoredDataSM.toShortName;
   }

   if (getstoredDataSM.pax) {
      owPax.innerHTML = `<span class="paxcount">${getstoredDataSM.pax}</span> ${
         parseInt(getstoredDataSM.pax) > 1 ? "Passengers" : "Passenger"
      }`;
   }

   if (getstoredDataSM.paxBreakdown) {
      owPax.setAttribute(
         "data-pax-breakdown",
         JSON.stringify(getstoredDataSM.paxBreakdown),
      );
   }
}

// for round trip
const rtFromAirpName = document.querySelector(".rwfaname");
const rtFromAirpId = document.querySelector(".rwfaid");
const rtToAirpName = document.querySelector(".rwtaname");
const rtToAirpId = document.querySelector(".rwtaid");
const rtFormatedDate = document.querySelector(".rwdateformated");
const rtDateAsText = document.querySelector(".rwdateastext");
const rtReturnDate = document.querySelector(".rwreturndate");
const rtPax = document.querySelector(".rwpax");
const rwFromAirpShortName = document.querySelector(".rwfashort");
const rwToAirpShortName = document.querySelector(".rwtashort");

function fillInputRound() {
   if (getstoredDataSM.formIdInput) {
      rtFromAirpName.innerHTML = `<span class="light_font">${getstoredDataSM.formIdInput}</span> <span>(${getstoredDataSM.fromShortName})</span>`;
   }
   if (getstoredDataSM.toIdInput) {
      rtToAirpName.innerHTML = `<span class="light_font">${getstoredDataSM.toIdInput}</span> <span>(${getstoredDataSM.toShortName})</span>`;
   }

   if (getstoredDataSM.fromId) {
      rtFromAirpId.textContent = getstoredDataSM.fromId;
   }

   if (getstoredDataSM.toId) {
      rtToAirpId.textContent = getstoredDataSM.toId;
   }
   if (getstoredDataSM.dateAsText) {
      rtDateAsText.textContent = getstoredDataSM.dateAsText;
   }

   if (getstoredDataSM.dateAsText) {
      rtReturnDate.textContent = getstoredDataSM.returnDateAsText;
   }

   if (getstoredDataSM.fromShortName) {
      rwFromAirpShortName.textContent = getstoredDataSM.fromShortName;
   }

   if (getstoredDataSM.toShortName) {
      rwToAirpShortName.textContent = getstoredDataSM.toShortName;
   }

   if (getstoredDataSM.dateAsText) {
      rtFormatedDate.textContent = `${formatDate(
         getstoredDataSM.dateAsText,
      )} - ${formatDate(getstoredDataSM.returnDateAsText)}`;
   }

   if (getstoredDataSM.pax) {
      rtPax.innerHTML = `<span class="paxcount">${getstoredDataSM.pax}</span> ${
         parseInt(getstoredDataSM.pax) > 1 ? "Passengers" : "Passenger"
      }`;
   }

   if (getstoredDataSM.paxBreakdown) {
      rtPax.setAttribute(
         "data-pax-breakdown",
         JSON.stringify(getstoredDataSM.paxBreakdown),
      );
   }
}

// for multicity
if (getstoredDataSM.way === "multi-city") {
   const isAnyArrayEmpty =
      (getstoredDataSM.fromId && getstoredDataSM.fromId.length === 0) ||
      (getstoredDataSM.toId && getstoredDataSM.toId.length === 0) ||
      (getstoredDataSM.formIdInput &&
         getstoredDataSM.formIdInput.length === 0) ||
      (getstoredDataSM.toIdInput && getstoredDataSM.toIdInput.length === 0) ||
      (getstoredDataSM.fromShortName &&
         getstoredDataSM.fromShortName.length === 0) ||
      (getstoredDataSM.toShortName &&
         getstoredDataSM.toShortName.length === 0) ||
      (getstoredDataSM.dateAsText && getstoredDataSM.dateAsText.length === 0) ||
      (getstoredDataSM.pax && getstoredDataSM.pax.length === 0);

   if (isAnyArrayEmpty) {
      const searchWrapper = document.querySelector(".search_mobile_wrapper");
      if (searchWrapper) {
         searchWrapper.innerHTML =
            "<p  class='new_flight'> <img src='https://cdn.prod.website-files.com/6713759f858863c516dbaa19/692c1f7902828a7c8eb67bab_plus_icon.png' alt='icon' /> Please add new flight</p>";
      }
   }
   for (let i = 0; i < getstoredDataSM.fromId.length; i++) {
      const paxBreakdownAttr =
         getstoredDataSM.paxBreakdown && getstoredDataSM.paxBreakdown[i]
            ? `data-pax-breakdown='${JSON.stringify(
                 getstoredDataSM.paxBreakdown[i],
              )}'`
            : "";

      document.querySelector(".multicity_box").innerHTML += `
      <div class="multicity_wrapping" data-from-storage="true" data-flight-index="${i}">
         <div class="flight_heading">
            <img
               src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6929904e2a85631be7392ee2_ms_cross.png"
               alt="cross_icon"
               class="remove-flight"
            />
            <p>Flight ${i + 1}</p>
         </div>
         <div class="mspop_cnt_box frompopup">
            <p>From</p>
            <div class="mspop_cnt_item">
               <div class="mspop_cnt_item_icon">
                  <img
                  src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/69299269ccb9fc2ec39c70ca_plan_icon1.png"
                  alt="icon"
                  />
               </div>
               <p class="mcfaname fromairportname"><span class="light_font">${
                  getstoredDataSM.formIdInput[i]
               }</span> <span>(${getstoredDataSM.fromShortName[i]})</span></p>
               <p class="mcfaid fromairportid">${getstoredDataSM.fromId[i]}</p>
               <p class="mcfashort fromairportshortcode">${
                  getstoredDataSM.fromShortName[i]
               }</p>
            </div>
         </div>
         <div class="mspop_cnt_box topopup">
            <p>To <img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/69299269992d97759a2c5742_dblarrow.png" alt="" /></p>
            <div class="mspop_cnt_item">
               <div class="mspop_cnt_item_icon">
                  <img
                  src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/692992693227baee55527900_plan_icon2.png"
                  alt="icon"
                  />
               </div>
               <p class="mctaname toairportname"> <span class="light_font">${
                  getstoredDataSM.toIdInput[i]
               } </span> <span>(${getstoredDataSM.toShortName[i]})</span></p>
               <p class="mctaid toairportid">${getstoredDataSM.toId[i]}</p>
               <p class="mctashort toairportshortcode">${
                  getstoredDataSM.toShortName[i]
               }</p>
            </div>
         </div>
         <div class="mspop_cnt_box datepopup">
            <p>Date</p>
            <div class="mspop_cnt_item">
               <div class="mspop_cnt_item_icon">
                  <img
                  src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/69299366e47ff54456ae3b44_datems.png"
                  alt="icon"
                  />
               </div>
               <p class="mcdateformated">${formatDate(
                  getstoredDataSM.dateAsText[i],
               )}</p>
               <p class="mcdateastext">${getstoredDataSM.dateAsText[i]}</p>
            </div>
         </div>
         <div class="mspop_cnt_box">
            <p>pax</p>
            <div class="mspop_cnt_item">
               <div class="mspop_cnt_item_icon">
                  <img
                  src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6929936640fd29b7b68bea70_paxms.png"
                  alt="icon"
                  />
               </div>
               <p class="mcpax" ${paxBreakdownAttr}><span class="paxcount">${
                  getstoredDataSM.pax[i]
               }</span> ${
                  parseInt(getstoredDataSM.pax[i]) > 1
                     ? "Passengers"
                     : "Passenger"
               }</p>
            </div>
         </div>
      </div>
    `;
   }
}

const multicityPreDefine = document.querySelector(".multicity_predefine");
if (getstoredDataSM.way === "multi-city") {
   multicityPreDefine.style.display = "none";
} else {
   multicityPreDefine.style.display = "block";
}

if (getstoredDataSM.way === "one way") {
   fillInputOneWay();
}

if (getstoredDataSM.way === "round trip") {
   fillInputRound();
}

// Add another flight functionality
const addNewBtn = document.querySelector(".addnew");
if (addNewBtn) {
   addNewBtn.addEventListener("click", () => {
      const multicityBox = document.querySelector(".multicity_box");
      const currentFlights = multicityBox.querySelectorAll(
         ".multicity_wrapping",
      );
      const predefineBlock = document.querySelector(".multicity_predefine");
      const isPredefineVisible =
         predefineBlock && predefineBlock.style.display !== "none";

      if (currentFlights.length >= 9) {
         showErrorToast("You can not add more flights");
         return;
      }

      // Calculate next flight number based on existing flights
      let nextFlightNumber;
      if (currentFlights.length > 0) {
         // Find the highest flight number from existing flights
         const flightNumbers = Array.from(currentFlights).map((flight) => {
            const flightText =
               flight.querySelector(".flight_heading p").textContent;
            const match = flightText.match(/Flight (\d+)/);
            return match ? parseInt(match[1]) : 0;
         });
         nextFlightNumber = Math.max(...flightNumbers) + 1;
      } else {
         // If no .multicity_wrapping exists, check if predefined Flight 1 is visible
         // If visible, next is Flight 2; if hidden (cleared), start from Flight 1
         nextFlightNumber = isPredefineVisible ? 2 : 1;
      }

      const newFlightBlock = `
      <div class="multicity_wrapping" data-from-storage="false">
         <div class="flight_heading">
            <img
               src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6929904e2a85631be7392ee2_ms_cross.png"
               alt="cross_icon"
               class="remove-flight"
            />
            <p>Flight ${nextFlightNumber}</p>
         </div>
         <div class="mspop_cnt_box frompopup">
            <p>From</p>
            <div class="mspop_cnt_item">
               <div class="mspop_cnt_item_icon">
                  <img
                  src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/69299269ccb9fc2ec39c70ca_plan_icon1.png"
                  alt="icon"
                  />
               </div>
               <p class="mcfaname fromairportname">Select airport</p>
               <p class="mcfaid fromairportid"></p>
               <p class="mcfashort fromairportshortcode"></p>
            </div>
         </div>
         <div class="mspop_cnt_box topopup">
            <p>To <img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/69299269992d97759a2c5742_dblarrow.png" alt="" /></p>
            <div class="mspop_cnt_item">
               <div class="mspop_cnt_item_icon">
                  <img
                  src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/692992693227baee55527900_plan_icon2.png"
                  alt="icon"
                  />
               </div>
               <p class="mctaname toairportname">Select airport</p>
               <p class="mctaid toairportid"></p>
               <p class="mctashort toairportshortcode"></p>
            </div>
         </div>
         <div class="mspop_cnt_box datepopup">
            <p>Date</p>
            <div class="mspop_cnt_item">
               <div class="mspop_cnt_item_icon">
                  <img
                  src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/69299366e47ff54456ae3b44_datems.png"
                  alt="icon"
                  />
               </div>
               <p class="mcdateformated">Select date</p>
               <p class="mcdateastext"></p>
            </div>
         </div>
         <div class="mspop_cnt_box">
            <p>pax</p>
            <div class="mspop_cnt_item">
               <div class="mspop_cnt_item_icon">
                  <img
                  src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6929936640fd29b7b68bea70_paxms.png"
                  alt="icon"
                  />
               </div>
               <p class="mcpax">Passenger</p>
            </div>
         </div>
      </div>
    `;

      multicityBox.insertAdjacentHTML("beforeend", newFlightBlock);
   });
}

// Remove flight functionality
document.addEventListener("click", (e) => {
   if (e.target.classList.contains("remove-flight")) {
      const flightBlock = e.target.closest(".multicity_wrapping");
      const isFromStorage =
         flightBlock.getAttribute("data-from-storage") === "true";
      const flightIndex = parseInt(
         flightBlock.getAttribute("data-flight-index"),
      );

      if (isFromStorage && !isNaN(flightIndex)) {
         // Remove from session storage
         const sessionData = sessionStorage.getItem("storeData");
         const storedData = JSON.parse(sessionData);

         if (storedData.way === "multi-city") {
            storedData.fromId.splice(flightIndex, 1);
            storedData.toId.splice(flightIndex, 1);
            storedData.formIdInput.splice(flightIndex, 1);
            storedData.toIdInput.splice(flightIndex, 1);
            storedData.fromShortName.splice(flightIndex, 1);
            storedData.toShortName.splice(flightIndex, 1);
            storedData.dateAsText.splice(flightIndex, 1);
            storedData.pax.splice(flightIndex, 1);

            if (storedData.paxBreakdown) {
               storedData.paxBreakdown.splice(flightIndex, 1);
            }

            sessionStorage.setItem("storeData", JSON.stringify(storedData));

            const isAnyArrayEmpty =
               (storedData.fromId && storedData.fromId.length === 0) ||
               (storedData.toId && storedData.toId.length === 0) ||
               (storedData.formIdInput &&
                  storedData.formIdInput.length === 0) ||
               (storedData.toIdInput && storedData.toIdInput.length === 0) ||
               (storedData.fromShortName &&
                  storedData.fromShortName.length === 0) ||
               (storedData.toShortName &&
                  storedData.toShortName.length === 0) ||
               (storedData.dateAsText && storedData.dateAsText.length === 0) ||
               (storedData.pax && storedData.pax.length === 0);

            if (isAnyArrayEmpty) {
               const searchWrapper = document.querySelector(
                  ".search_mobile_wrapper",
               );
               if (searchWrapper) {
                  searchWrapper.innerHTML =
                     "<p class='new_flight'> <img src='https://cdn.prod.website-files.com/6713759f858863c516dbaa19/692c1f7902828a7c8eb67bab_plus_icon.png' alt='icon' /> Please add new flight</p>";
               }
            }
         }
      }

      // Remove from DOM
      flightBlock.remove();

      // Update flight numbers
      const multicityBox = document.querySelector(".multicity_box");
      const allFlights = multicityBox.querySelectorAll(".multicity_wrapping");
      allFlights.forEach((flight, index) => {
         const flightHeading = flight.querySelector(".flight_heading p");
         flightHeading.textContent = `Flight ${index + 1}`;

         // Update data-flight-index for storage-based flights
         if (flight.getAttribute("data-from-storage") === "true") {
            flight.setAttribute("data-flight-index", index);
         }
      });
   }
});

// Calendar Implementation
document.addEventListener("DOMContentLoaded", function () {
   const daysTag = document.querySelector(".days-grid");
   const currentDateText = document.querySelector("#current-month-year");
   const prevNextIcon = document.querySelectorAll(".month-nav button");
   const displayDateText = document.getElementById("display-date-text");
   const saveBtn = document.querySelector(".save-btn");

   let date = new Date();
   let currYear = date.getFullYear();
   let currMonth = date.getMonth();

   // Selection state
   let startDate = null; // { day, month, year }
   let endDate = null; // { day, month, year }

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

   // Helper to compare dates
   const isSameDate = (d1, d2) =>
      d1 &&
      d2 &&
      d1.day === d2.day &&
      d1.month === d2.month &&
      d1.year === d2.year;
   const isBefore = (d1, d2) => {
      if (d1.year !== d2.year) return d1.year < d2.year;
      if (d1.month !== d2.month) return d1.month < d2.month;
      return d1.day < d2.day;
   };
   const isAfter = (d1, d2) => isBefore(d2, d1);

   const getSelectionMode = () => {
      // Check tab button
      const activeTab = document.querySelector(".ms_tab_item.active");
      if (
         activeTab &&
         activeTab.getAttribute("data-item") === "mstabroundtrip"
      ) {
         return "range";
      }
      // Check tab content (fallback)
      const roundTripContent = document.getElementById("mstabroundtrip");
      if (roundTripContent && roundTripContent.classList.contains("active")) {
         return "range";
      }
      return "single";
   };

   const renderCalendar = () => {
      let firstDayofMonth = new Date(currYear, currMonth, 1).getDay();
      let lastDateofMonth = new Date(currYear, currMonth + 1, 0).getDate();
      let lastDayofLastMonth = new Date(currYear, currMonth, 0).getDate();
      let lastDayofMonth = new Date(
         currYear,
         currMonth,
         lastDateofMonth,
      ).getDay();

      let liTag = "";

      // Current Month days
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Previous Month padding
      const prevMonthYear = currMonth === 0 ? currYear - 1 : currYear;
      const prevMonth = currMonth === 0 ? 11 : currMonth - 1;

      for (let i = firstDayofMonth; i > 0; i--) {
         const day = lastDayofLastMonth - i + 1;
         const dateToCheck = new Date(prevMonthYear, prevMonth, day);
         const isPast = dateToCheck < today;

         let className = "prev-month-day";
         let clickEvent = "";

         if (isPast) {
            className += " disabled";
         } else {
            const currentDayObj = {
               day: day,
               month: prevMonth,
               year: prevMonthYear,
            };

            if (isSameDate(currentDayObj, startDate)) {
               className += " active";
               if (endDate) className += " range-start";
            } else if (isSameDate(currentDayObj, endDate)) {
               className += " active range-end";
            } else if (
               startDate &&
               endDate &&
               isAfter(currentDayObj, startDate) &&
               isBefore(currentDayObj, endDate)
            ) {
               className += " in-range";
            }

            clickEvent = `data-day="${day}" data-month="${prevMonth}" data-year="${prevMonthYear}"`;
         }

         liTag += `<li class="${className}" ${clickEvent}>${day}</li>`;
      }

      for (let i = 1; i <= lastDateofMonth; i++) {
         const dateToCheck = new Date(currYear, currMonth, i);
         const isPast = dateToCheck < today;

         let className = "";
         let clickEvent = "";

         const currentDayObj = { day: i, month: currMonth, year: currYear };

         if (isPast) {
            className = "disabled";
         } else {
            // Determine classes based on selection
            if (isSameDate(currentDayObj, startDate)) {
               className += " active";
               if (endDate) className += " range-start";
            } else if (isSameDate(currentDayObj, endDate)) {
               className += " active range-end";
            } else if (
               startDate &&
               endDate &&
               isAfter(currentDayObj, startDate) &&
               isBefore(currentDayObj, endDate)
            ) {
               className += " in-range";
            }

            clickEvent = `data-day="${i}" data-month="${currMonth}" data-year="${currYear}"`;
         }

         liTag += `<li class="${className}" ${clickEvent}>${i}</li>`;
      }

      // Next Month padding
      const nextMonth = currMonth === 11 ? 0 : currMonth + 1;
      const nextMonthYear = currMonth === 11 ? currYear + 1 : currYear;

      for (let i = lastDayofMonth; i < 6; i++) {
         const day = i - lastDayofMonth + 1;
         const dateToCheck = new Date(nextMonthYear, nextMonth, day);
         const isPast = dateToCheck < today;

         let className = "next-month-day";
         let clickEvent = "";

         const currentDayObj = {
            day: day,
            month: nextMonth,
            year: nextMonthYear,
         };

         if (isPast) {
            className = "disabled";
         } else {
            if (isSameDate(currentDayObj, startDate)) {
               className += " active";
               if (endDate) className += " range-start";
            } else if (isSameDate(currentDayObj, endDate)) {
               className += " active range-end";
            } else if (
               startDate &&
               endDate &&
               isAfter(currentDayObj, startDate) &&
               isBefore(currentDayObj, endDate)
            ) {
               className += " in-range";
            }

            clickEvent = `data-day="${day}" data-month="${nextMonth}" data-year="${nextMonthYear}"`;
         }

         liTag += `<li class="${className}" ${clickEvent}>${day}</li>`;
      }

      currentDateText.innerText = `${months[
         currMonth
      ].toUpperCase()}, ${currYear}`;
      daysTag.innerHTML = liTag;

      // Attach click listeners to new elements
      document
         .querySelectorAll(".days-grid li:not(.inactive):not(.disabled)")
         .forEach((li) => {
            li.addEventListener("click", () => {
               const d = parseInt(li.getAttribute("data-day"));
               const m = parseInt(li.getAttribute("data-month"));
               const y = parseInt(li.getAttribute("data-year"));
               handleDateClick(d, m, y);
            });
         });

      updateDisplay();
   };

   const handleDateClick = (day, month, year) => {
      const clickedDate = { day, month, year };
      const mode = getSelectionMode();

      if (mode === "single") {
         startDate = clickedDate;
         endDate = null;
      } else {
         // Range mode
         if (!startDate || (startDate && endDate)) {
            // Start new range
            startDate = clickedDate;
            endDate = null;
         } else {
            // Completing a range
            if (isBefore(clickedDate, startDate)) {
               // Clicked before start, so it becomes new start
               startDate = clickedDate;
            } else if (isSameDate(clickedDate, startDate)) {
               // Clicked same date, do nothing or toggle? Let's keep it as start
            } else {
               endDate = clickedDate;
            }
         }
      }
      renderCalendar();
   };

   const updateDisplay = () => {
      const returnDateDisplay = document.querySelector(".return-date-display");
      const displayReturnDateText = document.getElementById(
         "display-return-date-text",
      );
      const mode = getSelectionMode();

      if (mode === "range") {
         if (returnDateDisplay) {
            returnDateDisplay.style.display = "block";
            // Ensure it's visible even if inline style says none
            returnDateDisplay.style.removeProperty("display");
            returnDateDisplay.style.display = "block";
         }
      } else {
         if (returnDateDisplay) returnDateDisplay.style.display = "none";
      }

      const formatDate = (d) => {
         const dateObj = new Date(d.year, d.month, d.day);
         return dateObj.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
         });
      };

      if (!startDate) {
         displayDateText.innerText = "Select a date";
         if (displayReturnDateText)
            displayReturnDateText.innerText = "Select a date";
         return;
      }

      displayDateText.innerText = formatDate(startDate);

      if (endDate) {
         if (displayReturnDateText)
            displayReturnDateText.innerText = formatDate(endDate);
      } else {
         if (displayReturnDateText)
            displayReturnDateText.innerText = "Select a date";
      }
   };

   prevNextIcon.forEach((icon) => {
      icon.addEventListener("click", () => {
         currMonth = icon.id === "prev-btn" ? currMonth - 1 : currMonth + 1;

         if (currMonth < 0 || currMonth > 11) {
            currYear = icon.id === "prev-btn" ? currYear - 1 : currYear + 1;
            currMonth = currMonth < 0 ? 11 : 0;
         }
         renderCalendar();
      });
   });

   // Initial render
   renderCalendar();

   // Handle Save
   saveBtn.addEventListener("click", () => {
      if (!startDate) return;

      const formatDateStr = (d) => {
         const dateObj = new Date(d.year, d.month, d.day);
         return dateObj.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
         });
      };

      const formatDateText = (d) => {
         const dateObj = new Date(d.year, d.month, d.day);
         const year = dateObj.getFullYear();
         const month = String(dateObj.getMonth() + 1).padStart(2, "0");
         const day = String(dateObj.getDate()).padStart(2, "0");
         return `${year}-${month}-${day}`;
      };

      if (window.currentClickedPopup) {
         const container = window.currentClickedPopup;

         // One Way / Multi-city
         const dateFormatted = container.querySelector(
            ".owdateformated, .mcdateformated",
         );
         const dateAsText = container.querySelector(
            ".owdateastext, .mcdateastext",
         );

         // Round Trip
         const rwDateFormatted = container.querySelector(".rwdateformated");
         const rwDateAsText = container.querySelector(".rwdateastext");
         const rwReturnDate = container.querySelector(".rwreturndate");

         if (getSelectionMode() === "range") {
            if (rwDateFormatted) {
               if (endDate) {
                  rwDateFormatted.textContent = `${formatDateStr(
                     startDate,
                  )} - ${formatDateStr(endDate)}`;
               } else {
                  rwDateFormatted.textContent = formatDateStr(startDate);
               }
            }
            if (rwDateAsText)
               rwDateAsText.textContent = formatDateText(startDate);
            if (rwReturnDate && endDate)
               rwReturnDate.textContent = formatDateText(endDate);
         } else {
            if (dateFormatted)
               dateFormatted.textContent = formatDateStr(startDate);
            if (dateAsText) dateAsText.textContent = formatDateText(startDate);

            // Also handle round trip if it was somehow in single mode or just updating start
            if (rwDateFormatted)
               rwDateFormatted.textContent = formatDateStr(startDate);
            if (rwDateAsText)
               rwDateAsText.textContent = formatDateText(startDate);
         }
      }

      document.querySelector(".date_popup").style.display = "none";
   });

   // Reset calendar when opening popup
   document.addEventListener("click", function (e) {
      const datePopup = e.target.closest(".datepopup");
      if (datePopup) {
         let dateToSet = null;
         let endDateToSet = null;

         // Try to find existing start date
         const dateTextEl = datePopup.querySelector(
            ".owdateastext, .mcdateastext, .rwdateastext",
         );

         if (dateTextEl) {
            const dateString = dateTextEl.textContent.trim();
            // Check if it looks like a valid date
            if (dateString && !isNaN(Date.parse(dateString))) {
               const [y, m, d] = dateString.split("-").map(Number);
               dateToSet = new Date(y, m - 1, d);
            }
         }

         // Try to find existing return date (for round trip)
         const returnDateEl = datePopup.querySelector(".rwreturndate");
         if (returnDateEl) {
            const returnDateString = returnDateEl.textContent.trim();
            if (returnDateString && !isNaN(Date.parse(returnDateString))) {
               const [y, m, d] = returnDateString.split("-").map(Number);
               endDateToSet = new Date(y, m - 1, d);
            }
         }

         if (dateToSet) {
            startDate = {
               day: dateToSet.getDate(),
               month: dateToSet.getMonth(),
               year: dateToSet.getFullYear(),
            };
            // Reset view to the month of the selected date
            currMonth = dateToSet.getMonth();
            currYear = dateToSet.getFullYear();
         } else {
            startDate = null;
            // Reset view to current month
            const now = new Date();
            currMonth = now.getMonth();
            currYear = now.getFullYear();
         }

         if (endDateToSet) {
            endDate = {
               day: endDateToSet.getDate(),
               month: endDateToSet.getMonth(),
               year: endDateToSet.getFullYear(),
            };
         } else {
            endDate = null;
         }

         renderCalendar();
      }
   });
});

// PAX Popup Logic
(function () {
   const paxPopup = document.querySelector(".pax_popup");
   const paxPopupClose = document.querySelector(
      ".pax_popup_header .msp_header_icon",
   );
   const savePaxBtn = document.querySelector(".save-pax-btn");
   let currentPaxElement = null;

   // Open PAX Popup (Event Delegation)
   document.addEventListener("click", function (e) {
      // Check if the clicked element is inside a pax container
      const paxItem = e.target.closest(".mspop_cnt_item");

      if (paxItem) {
         const paxTextElement = paxItem.querySelector(".owpax, .rwpax, .mcpax");

         if (paxTextElement) {
            currentPaxElement = paxTextElement;

            const savedBreakdown =
               currentPaxElement.getAttribute("data-pax-breakdown");
            const counters = document.querySelectorAll(".pax_count");

            if (savedBreakdown) {
               const values = JSON.parse(savedBreakdown);
               counters.forEach((span, index) => {
                  if (values[index] !== undefined) {
                     span.textContent = values[index];
                  } else {
                     span.textContent = "0";
                  }
               });
            } else {
               // No breakdown saved, try to use total pax for Adults
               let totalPax = 0;
               const sessionData = JSON.parse(
                  sessionStorage.getItem("storeData") || "{}",
               );

               if (
                  currentPaxElement.classList.contains("owpax") &&
                  sessionData.way === "one way"
               ) {
                  totalPax = parseInt(sessionData.pax) || 0;
               } else if (
                  currentPaxElement.classList.contains("rwpax") &&
                  sessionData.way === "round trip"
               ) {
                  totalPax = parseInt(sessionData.pax) || 0;
               } else if (
                  currentPaxElement.classList.contains("mcpax") &&
                  sessionData.way === "multi-city"
               ) {
                  const wrapper = currentPaxElement.closest(
                     ".multicity_wrapping",
                  );
                  if (
                     wrapper &&
                     wrapper.getAttribute("data-from-storage") === "true"
                  ) {
                     const index = parseInt(
                        wrapper.getAttribute("data-flight-index"),
                     );
                     if (
                        !isNaN(index) &&
                        sessionData.pax &&
                        sessionData.pax[index]
                     ) {
                        totalPax = parseInt(sessionData.pax[index]) || 0;
                     }
                  }
               }

               // Fallback to DOM if session storage didn't yield a result
               if (totalPax === 0) {
                  const totalPaxSpan =
                     currentPaxElement.querySelector(".paxcount");
                  totalPax = totalPaxSpan
                     ? parseInt(totalPaxSpan.textContent)
                     : 0;
               }

               counters.forEach((span, index) => {
                  if (index === 0) {
                     span.textContent = totalPax;
                  } else {
                     span.textContent = "0";
                  }
               });
            }

            if (paxPopup) paxPopup.style.display = "block";
         }
      }
   });

   // Close PAX Popup
   if (paxPopupClose) {
      paxPopupClose.addEventListener("click", function () {
         if (paxPopup) paxPopup.style.display = "none";
      });
   }

   // Handle Counters
   const counters = document.querySelectorAll(".pax_counter");
   counters.forEach((counter) => {
      const minusBtn = counter.querySelector(".pax_minus");
      const plusBtn = counter.querySelector(".pax_plus");
      const countSpan = counter.querySelector(".pax_count");

      minusBtn.addEventListener("click", function () {
         let count = parseInt(countSpan.textContent);
         if (count > 0) {
            count--;
            countSpan.textContent = count;
         }
      });

      plusBtn.addEventListener("click", function () {
         let count = parseInt(countSpan.textContent);
         count++;
         countSpan.textContent = count;
      });
   });

   // Save Passengers
   if (savePaxBtn) {
      savePaxBtn.addEventListener("click", function () {
         let totalPax = 0;
         const breakdown = [];

         document.querySelectorAll(".pax_count").forEach((span) => {
            const count = parseInt(span.textContent);
            totalPax += count;
            breakdown.push(count);
         });

         if (totalPax === 0) {
            showErrorToast("Add at least 1 passenger");
            return;
         }

         if (currentPaxElement) {
            let text = `<span class="paxcount">${totalPax}</span> ${
               totalPax > 1 ? "Passengers" : "Passenger"
            }`;
            currentPaxElement.innerHTML = text;
            currentPaxElement.setAttribute(
               "data-pax-breakdown",
               JSON.stringify(breakdown),
            );
         }

         if (paxPopup) paxPopup.style.display = "none";
      });
   }
})();

// update session storage and display new search result

function saveRecentSearch(data) {
   let recentSearches = JSON.parse(
      localStorage.getItem("recentSearch") || "[]",
   );
   recentSearches.unshift(data);
   if (recentSearches.length > 5) {
      recentSearches = recentSearches.slice(0, 5);
   }
   localStorage.setItem("recentSearch", JSON.stringify(recentSearches));
}

document.addEventListener("DOMContentLoaded", function () {
   try {
      const userEmail = Cookies.get("userEmail");
      const authToken = Cookies.get("authToken");

      if (userEmail && authToken) {
         // Remove signin prompts if user is logged in
         const fromSignin = document.querySelector(".from_signin");
         if (fromSignin) fromSignin.remove();

         const toSignin = document.querySelector(".to_signin");
         if (toSignin) toSignin.remove();

         // print all info with session storage with dom
      }
   } catch (error) {}
});

function showErrorToast(message) {
   const toastMessage = document.getElementById("toastMessage");
   if (toastMessage && window.toast) {
      toastMessage.textContent = message;
      window.toast.show();
   } else {
      alert(message);
   }
}

// One Way Submission
document
   .querySelector(".oneway_search_btn")
   .addEventListener("click", function () {
      const formIdInput = document.querySelector(
         ".owfaname span.light_font",
      )?.textContent;
      const toIdInput = document.querySelector(
         ".owtaname span.light_font",
      )?.textContent;
      const fromId = document.querySelector(".owfaid")?.textContent;
      const toId = document.querySelector(".owtaid")?.textContent;
      const dateAsText = document.querySelector(".owdateastext")?.textContent;
      const timeAsText = "00:00:00";
      const pax = document.querySelector("#mstaboneway .paxcount")?.textContent;
      const appDate = dateAsText;
      const fromShortName = document.querySelector(".owfashort")?.textContent;
      const toShortName = document.querySelector(".owtashort")?.textContent;
      const timeStamp = getUnixTimestamp(dateAsText, timeAsText);

      const paxElement = document.querySelector("#mstaboneway .owpax");
      const paxBreakdown = paxElement?.getAttribute("data-pax-breakdown");

      // Get nearby airport checkbox values
      const isFromNearby = oneWayFromNearby ? "Yes" : "No";
      const isToNearby = oneWayToNearby ? "Yes" : "No";

      if (!fromId || !formIdInput || !fromShortName) {
         showErrorToast("Please select a departure airport");
         return;
      }
      if (!toId || !toIdInput || !toShortName) {
         showErrorToast("Please select an arrival airport");
         return;
      }
      if (!dateAsText) {
         showErrorToast("Please select a date");
         return;
      }
      if (!pax) {
         showErrorToast("Please select passengers");
         return;
      }

      const storeData = {
         way: "one way",
         fromId,
         toId,
         dateAsText,
         timeAsText,
         pax,
         appDate,
         timeStamp,
         formIdInput,
         toIdInput,
         fromShortName,
         toShortName,
         isFromNearby,
         isToNearby,
         paxBreakdown: paxBreakdown
            ? JSON.parse(paxBreakdown)
            : pax
              ? [parseInt(pax)]
              : [],
      };

      saveRecentSearch(storeData);
      sessionStorage.setItem("storeData", JSON.stringify(storeData));
      window.location.href = `/aircraft`;
   });

// ✅ Round Trip Submission
document
   .querySelector(".round_search_btn")
   .addEventListener("click", function () {
      const formIdInput = document.querySelector(
         ".rwfaname span.light_font",
      )?.textContent;
      const toIdInput = document.querySelector(
         ".rwtaname span.light_font",
      )?.textContent;

      const fromInputReturn = toIdInput;
      const toInputReturn = formIdInput;

      const fromId = document.querySelector(".rwfaid")?.textContent;
      const toId = document.querySelector(".rwtaid")?.textContent;

      const returnFromId = toId;
      const returnToId = fromId;

      const dateAsText = document.querySelector(".rwdateastext")?.textContent;
      const returnDateAsText =
         document.querySelector(".rwreturndate")?.textContent;

      const timeAsText = "00:00:00";
      const timeAsTextReturn = "00:00:00";

      const pax = document.querySelector(
         "#mstabroundtrip .paxcount",
      )?.textContent;
      const paxReturn = pax;

      const appDate = dateAsText;
      const appDateReturn = returnDateAsText;

      const timeStamp = getUnixTimestamp(dateAsText, timeAsText);
      const timeStampReturn = getUnixTimestamp(
         returnDateAsText,
         timeAsTextReturn,
      );

      const fromShortName = document.querySelector(".rwfashort")?.textContent;
      const toShortName = document.querySelector(".rwtashort")?.textContent;

      const paxElement = document.querySelector("#mstabroundtrip .rwpax");
      const paxBreakdown = paxElement?.getAttribute("data-pax-breakdown");

      // Get nearby airport checkbox values
      const isFromNearby = roundTripFromNearby ? "Yes" : "No";
      const isToNearby = roundTripToNearby ? "Yes" : "No";

      if (!formIdInput || !fromShortName) {
         showErrorToast("Please select a departure airport");
         return;
      }
      if (!toIdInput || !toShortName) {
         showErrorToast("Please select an arrival airport");
         return;
      }
      if (!dateAsText) {
         showErrorToast("Please select a departure date");
         return;
      }
      if (!returnDateAsText) {
         showErrorToast("Please select a return date");
         return;
      }
      if (!pax) {
         showErrorToast("Please select passengers");
         return;
      }

      const storeData = {
         way: "round trip",
         formIdInput,
         toIdInput,
         fromInputReturn,
         toInputReturn,
         fromId,
         toId,
         returnFromId,
         returnToId,
         dateAsText,
         returnDateAsText,
         timeAsText,
         timeAsTextReturn,
         pax,
         paxReturn,
         appDate,
         appDateReturn,
         timeStamp,
         timeStampReturn,
         fromShortName,
         toShortName,
         isFromNearby,
         isToNearby,
         paxBreakdown: paxBreakdown
            ? JSON.parse(paxBreakdown)
            : pax
              ? [parseInt(pax)]
              : [],
      };

      saveRecentSearch(storeData);
      sessionStorage.setItem("storeData", JSON.stringify(storeData));
      window.location.href = `/aircraft`;
   });

// ✅ Multi-City Submission
document
   .querySelector(".multicity_search_btn")
   .addEventListener("click", function () {
      const containers = [];
      const predefine = document.querySelector(".multicity_predefine");
      if (predefine && predefine.offsetParent !== null) {
         containers.push(predefine);
      }
      document
         .querySelectorAll(".multicity_wrapping")
         .forEach((el) => containers.push(el));

      if (containers.length === 0) {
         showErrorToast("Please Add Leg");
         return;
      }

      let storeFormPort = [],
         storeToPort = [],
         storeFormId = [],
         storeToId = [];
      let storeDate = [],
         storeAppDate = [],
         storeTime = [],
         storePax = [];
      let storeFromShortName = [],
         storeToShortName = [];
      let multiUnixTime = [];
      let storePaxBreakdown = [];

      let isValid = true;
      const timeAsText = "00:00:00";

      let errorMessage = "";

      containers.forEach((container, index) => {
         const fromPort = container.querySelector(
            ".mcfaname span.light_font",
         )?.textContent;
         const toPort = container.querySelector(
            ".mctaname span.light_font",
         )?.textContent;
         const fromId = container.querySelector(".mcfaid")?.textContent;
         const toId = container.querySelector(".mctaid")?.textContent;
         const dateText = container.querySelector(".mcdateastext")?.textContent;
         const pax = container.querySelector(".paxcount")?.textContent;
         const fromShort = container.querySelector(".mcfashort")?.textContent;
         const toShort = container.querySelector(".mctashort")?.textContent;

         const paxElement = container.querySelector(".mcpax");
         const breakdown = paxElement?.getAttribute("data-pax-breakdown");

         if (!fromPort || !fromId || !fromShort) {
            if (!errorMessage)
               errorMessage = `Flight ${index + 1}: Please select a departure airport`;
            isValid = false;
         } else if (!toPort || !toId || !toShort) {
            if (!errorMessage)
               errorMessage = `Flight ${index + 1}: Please select an arrival airport`;
            isValid = false;
         } else if (!dateText) {
            if (!errorMessage)
               errorMessage = `Flight ${index + 1}: Please select a date`;
            isValid = false;
         } else if (!pax) {
            if (!errorMessage)
               errorMessage = `Flight ${index + 1}: Please select passengers`;
            isValid = false;
         }

         if (isValid) {
            storeFormPort.push(fromPort);
            storeToPort.push(toPort);
            storeFormId.push(fromId);
            storeToId.push(toId);
            storeDate.push(dateText);
            storeAppDate.push(dateText);
            storeTime.push(timeAsText);
            storePax.push(pax);
            storeFromShortName.push(fromShort);
            storeToShortName.push(toShort);
            multiUnixTime.push(getUnixTimestamp(dateText, timeAsText));
            storePaxBreakdown.push(
               breakdown ? JSON.parse(breakdown) : pax ? [parseInt(pax)] : [],
            );
         }
      });
      if (isValid && containers.length > 0) {
         const storeData = {
            way: "multi-city",
            fromId: storeFormId,
            toId: storeToId,
            dateAsText: storeDate,
            timeAsText: storeTime,
            pax: storePax,
            appDate: storeAppDate,
            timeStamp: multiUnixTime,
            formIdInput: storeFormPort,
            toIdInput: storeToPort,
            fromShortName: storeFromShortName,
            toShortName: storeToShortName,
            paxBreakdown: storePaxBreakdown,
         };

         sessionStorage.setItem("storeData", JSON.stringify(storeData));
         window.location.href = `/aircraft`;
      } else {
         showErrorToast(errorMessage || "Please fill up the form properly.");
      }
   });

//!===========================================================
//!           New mulitstep form popup code Start
//! ===========================================================

// Smooth fade-out helper for the new popup
function hideNewPopup(callback) {
   var popup = document.querySelector(".new_popup");
   if (!popup) return;
   popup.classList.add("np-fade-out");
   setTimeout(function () {
      popup.style.display = "none";
      popup.classList.remove("np-fade-out");
      document.body.style.overflow = "";
      if (typeof callback === "function") callback();
   }, 400); // matches CSS transition duration
}

// intlTelInput initialization for phone_popup
var input = document.querySelector("#phone_popup");
if (input) {
   window.itiPopup = window.intlTelInput(input, {
      utilsScript:
         "https://29101afcd41198dafcdd8b88cbac692a.cdn.bubble.io/f1754868069986x904074362622997900/utils.js",
   });
}

// ========================================
// Common: Reset all popup forms on page load
// ========================================
document.addEventListener("DOMContentLoaded", function () {
   // Reset all form inputs inside the popup
   var popupForms = document.querySelectorAll(".new_popup form");
   popupForms.forEach(function (form) {
      form.reset();
   });

   // Restore initial display states
   var stepOneForm = document.getElementById("stepOneForm");
   var stepTwoForm = document.getElementById("stepTwoForm");
   var stepThreeForm = document.getElementById("stepThreeForm");
   var stepFourForm = document.getElementById("stepFourForm");
   var finalPopup = document.getElementById("finalPopup");
   var newPopupWrapper = document.querySelector(".new_popup_wrapper");

   if (stepOneForm) stepOneForm.style.display = "block";
   if (stepTwoForm) stepTwoForm.style.display = "none";
   if (stepThreeForm) stepThreeForm.style.display = "none";
   if (stepFourForm) stepFourForm.style.display = "none";
   if (finalPopup) finalPopup.style.display = "none";
   if (newPopupWrapper) newPopupWrapper.style.display = "";
});

// ========================================
// Common: Button Loading State with Animated Dots
// ========================================
function startButtonLoading(button) {
   const originalText = button.textContent;
   button.disabled = true;
   button.innerHTML = 'Please wait<span class="loading-dots"></span>';

   const dotsSpan = button.querySelector(".loading-dots");
   let dotCount = 0;
   const interval = setInterval(function () {
      dotCount = (dotCount % 3) + 1;
      dotsSpan.textContent = ".".repeat(dotCount);
   }, 400);

   // Return a stop function to restore button
   return function stopLoading() {
      clearInterval(interval);
      button.disabled = false;
      button.textContent = originalText;
   };
}

// ========================================
// Common: Popup Toast Message
// ========================================
function showNpToast(message) {
   const npToastMessage = document.getElementById("npToastMessage");
   const npToastEl = document.getElementById("npToast");
   npToastMessage.textContent = message;
   npToastEl.style.display = "block";
   setTimeout(function () {
      npToastEl.style.display = "none";
   }, 4000);
}

// ========================================
// Common: Auto-show Popup (10s delay if not logged in)
// ========================================
document.addEventListener("DOMContentLoaded", function () {
   const newPopup = document.querySelector(".new_popup");
   const userEmail =
      typeof Cookies !== "undefined" ? Cookies.get("userEmail") : null;
   const authToken =
      typeof Cookies !== "undefined" ? Cookies.get("authToken") : null;

   if (userEmail && authToken) {
      newPopup.style.display = "none";
   } else {
      setTimeout(function () {
         newPopup.style.display = "flex";
         document.body.style.overflow = "hidden";
      }, 10000);
   }
});

// ========================================
// Common: Cross Button — Close Popup
// ========================================
document.addEventListener("DOMContentLoaded", function () {
   var crossButtons = document.querySelectorAll(".np_cross");
   var newPopup = document.querySelector(".new_popup");

   crossButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
         hideNewPopup(function () {
            // Reset all step forms to initial state (step 1 visible, rest hidden)
            const stepOneForm = document.getElementById("stepOneForm");
            const stepTwoForm = document.getElementById("stepTwoForm");
            const stepThreeForm = document.getElementById("stepThreeForm");
            const stepFourForm = document.getElementById("stepFourForm");
            const forgotPassForm = document.getElementById("forgotPassForm");
            const finalPopup = document.getElementById("finalPopup");
            const newPopupWrapper =
               document.querySelector(".new_popup_wrapper");

            if (stepOneForm) stepOneForm.style.display = "block";
            if (stepTwoForm) stepTwoForm.style.display = "none";
            if (stepThreeForm) stepThreeForm.style.display = "none";
            if (stepFourForm) stepFourForm.style.display = "none";
            if (forgotPassForm) forgotPassForm.style.display = "none";
            if (finalPopup) finalPopup.style.display = "none";
            if (newPopupWrapper) newPopupWrapper.style.display = "grid";

            // Reset all forms inside the popup
            const allForms = document.querySelectorAll(".new_popup form");
            allForms.forEach(function (form) {
               form.reset();
               form.style.display = "block";
            });

            // Hide forgot password success message if visible
            const forgotPassSuccess =
               document.getElementById("forgotPassSuccess");
            if (forgotPassSuccess) forgotPassSuccess.style.display = "none";
         });
      });
   });
});

// ========================================
//      Step 1 email subscribe Form
// ========================================
document.addEventListener("DOMContentLoaded", function () {
   const stepOneForm = document.getElementById("stepOneForm");
   const stepOneEmailInput = document.getElementById("nps_one_email");
   const stepOneFormTag = stepOneForm.querySelector("form");
   const stepOneSubmitBtn = document.getElementById("nps_one_submit");
   const stepTwoForm = document.getElementById("stepTwoForm");
   let isLoading = false;
   stepOneFormTag.addEventListener("submit", function (e) {
      e.preventDefault();
      if (isLoading) return;
      const email = stepOneEmailInput.value.trim();
      if (!email) {
         return;
      }
      isLoading = true;
      const stopLoading = startButtonLoading(stepOneSubmitBtn);
      fetch(
         "https://operators-dashboard.bubbleapps.io/api/1.1/wf/email_phone_verification",
         {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: email }),
         },
      )
         .then(function (response) {
            return response.json();
         })
         .then(function (verifyData) {
            if (
               verifyData.response.email_status !== "DELIVERABLE" ||
               verifyData.response.disposable_email === true
            ) {
               showNpToast("Please enter a valid email.");
               isLoading = false;
               stopLoading();
               return;
            }
            // Add to Klaviyo
            return fetch(
               "https://operators-dashboard.bubbleapps.io/api/1.1/wf/text_addtoklaviyo",
               {
                  method: "POST",
                  headers: {
                     "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ email: email }),
               },
            )
               .then(function (response) {
                  return response.json();
               })
               .then(function () {
                  // Check if user already has an account
                  return fetch(
                     "https://operators-dashboard.bubbleapps.io/api/1.1/wf/check_user",
                     {
                        method: "POST",
                        headers: {
                           "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ email: email }),
                     },
                  );
               })
               .then(function (response) {
                  return response.json();
               })
               .then(function (checkData) {
                  isLoading = false;
                  stopLoading();

                  stepOneForm.style.display = "none";
                  stepOneFormTag.reset();

                  if (checkData.response && checkData.response.has_account) {
                     // User exists → show Login (Step 2)
                     showNpToast("Welcome back! Please log in.");
                     var stepTwoEmailInput =
                        document.getElementById("nps_two_email");
                     if (stepTwoEmailInput) stepTwoEmailInput.value = email;
                     stepTwoForm.style.display = "block";
                  } else {
                     // New user → show Signup (Step 3)
                     showNpToast("Let's create your account!");
                     var stepThreeForm =
                        document.getElementById("stepThreeForm");
                     var stepThreeEmailInput =
                        document.getElementById("nps_three_email");
                     if (stepThreeEmailInput) stepThreeEmailInput.value = email;
                     if (stepThreeForm) stepThreeForm.style.display = "block";
                  }
               });
         })
         .catch(function (error) {
            console.error("API Error:", error);
            isLoading = false;
            stopLoading();
            showNpToast("Something went wrong. Please try again.");
         });
   });

   //! "Login" link click — show step 2 (login form)
   const stepOneLogin = document.getElementById("stepOneLogin");
   stepOneLogin.addEventListener("click", function () {
      // Pre-fill login form email with step 1 email
      var stepTwoEmailInput = document.getElementById("nps_two_email");
      if (stepTwoEmailInput)
         stepTwoEmailInput.value = stepOneEmailInput.value.trim();
      stepOneForm.style.display = "none";
      stepTwoForm.style.display = "block";
   });
});

// ========================================
//              Step 2 Login Form
// ========================================
document.addEventListener("DOMContentLoaded", function () {
   const stepTwoForm = document.getElementById("stepTwoForm");
   const stepTwoFormTag = stepTwoForm.querySelector("form");
   const stepTwoEmailInput = document.getElementById("nps_two_email");
   const stepTwoPwInput = document.getElementById("nps_two_pw");
   const stepTwoSubmitBtn = document.getElementById("nps_two_submit");
   const stepFourForm = document.getElementById("stepFourForm");
   const finalPopup = document.getElementById("finalPopup");
   const newPopupWrapper = document.querySelector(".new_popup_wrapper");

   let isLoading = false;
   stepTwoFormTag.addEventListener("submit", function (e) {
      e.preventDefault();
      if (isLoading) return;
      const email = stepTwoEmailInput.value.trim();
      const password = stepTwoPwInput.value;
      if (!email || !password) {
         return;
      }
      isLoading = true;
      const stopLoading = startButtonLoading(stepTwoSubmitBtn);
      fetch(
         "https://operators-dashboard.bubbleapps.io/api/1.1/wf/webflow_login",
         {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: email, password: password }),
         },
      )
         .then(function (response) {
            return response.json().then(function (data) {
               return { ok: response.ok, data: data };
            });
         })
         .then(function (result) {
            isLoading = false;
            stopLoading();
            if (result.ok && result.data && result.data.response) {
               Cookies.set("userEmail", email, { expires: 7, secure: true });
               if (result.data.response.token) {
                  Cookies.set("authToken", result.data.response.token, {
                     expires: 7,
                     secure: true,
                  });
               }
               if (
                  typeof tatari !== "undefined" &&
                  result.data.response.user_id
               ) {
                  tatari.identify(result.data.response.user_id);
                  tatari.track("Login", {
                     user_id: result.data.response.user_id,
                  });
               }
               if (typeof updateKlaviyoTrackingFromAPI === "function") {
                  updateKlaviyoTrackingFromAPI(result.data);
               }
               if (typeof updateUIForLoggedInUser === "function") {
                  updateUIForLoggedInUser(email);
               }
               window.dispatchEvent(new Event("loginSuccess"));
               if (typeof sendFlightRequestIdsIfLoggedIn === "function") {
                  sendFlightRequestIdsIfLoggedIn();
               }
               showNpToast("Login successful!");
               stepTwoFormTag.reset();
               stepTwoForm.style.display = "none";
               // Login: skip preferences, go directly to confirmation
               newPopupWrapper.style.display = "none";
               finalPopup.style.display = "block";
               // Auto-hide popup after 2 seconds
               window._autoHidePopupTimer = setTimeout(function () {
                  hideNewPopup();
               }, 2000);
            } else {
               showNpToast(
                  "Login failed: " +
                     (result.data.message || "Invalid credentials"),
               );
            }
         })
         .catch(function (error) {
            console.error("Login Error:", error);
            isLoading = false;
            stopLoading();
            showNpToast("An error occurred during login. Please try again.");
         });
   });

   //! Password eye toggle
   const pwEyeBtn = document.getElementById("pweye");
   const pwEyeImg = pwEyeBtn.querySelector("img");
   const eyeOpenSrc =
      "https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6a4f765ca44c6e29b6965b8d_eye.svg";
   const eyeClosedSrc =
      "https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6a4f765c5f99d0ccd22fb246_eye-off.svg";
   pwEyeBtn.addEventListener("click", function () {
      if (stepTwoPwInput.type === "password") {
         stepTwoPwInput.type = "text";
         pwEyeImg.src = eyeClosedSrc;
      } else {
         stepTwoPwInput.type = "password";
         pwEyeImg.src = eyeOpenSrc;
      }
   });

   //! "Create Account Instead" link click — show step 3
   const stepTwoSignup = document.getElementById("stepTwoSignup");
   const stepThreeForm = document.getElementById("stepThreeForm");
   stepTwoSignup.addEventListener("click", function () {
      stepTwoForm.style.display = "none";
      stepThreeForm.style.display = "block";
   });

   //! "Forgot Password?" link click — show forgot password form
   const forgetPassLink = document.getElementById("forgetPass");
   const forgotPassForm = document.getElementById("forgotPassForm");
   forgetPassLink.addEventListener("click", function () {
      stepTwoForm.style.display = "none";
      forgotPassForm.style.display = "block";
   });
});

// ========================================
//         Forgot Password Form
// ========================================
document.addEventListener("DOMContentLoaded", function () {
   const forgotPassForm = document.getElementById("forgotPassForm");
   const forgotFormTag = forgotPassForm.querySelector("form");
   const forgotEmailInput = document.getElementById("nps_forgot_email");
   const forgotSubmitBtn = document.getElementById("nps_forgot_submit");
   const forgotPassSuccess = document.getElementById("forgotPassSuccess");
   const stepTwoForm = document.getElementById("stepTwoForm");

   let isLoading = false;
   forgotFormTag.addEventListener("submit", function (e) {
      e.preventDefault();
      if (isLoading) return;
      const email = forgotEmailInput.value.trim();
      if (!email) {
         return;
      }
      isLoading = true;
      const stopLoading = startButtonLoading(forgotSubmitBtn);
      fetch(
         "https://operators-dashboard.bubbleapps.io/api/1.1/wf/webflow_forgotpassword",
         {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: email }),
         },
      )
         .then(function (response) {
            return response.json().then(function (data) {
               return { ok: response.ok, data: data };
            });
         })
         .then(function (result) {
            isLoading = false;
            stopLoading();
            if (result.ok) {
               // Hide the form, show the success message
               forgotFormTag.style.display = "none";
               forgotPassSuccess.style.display = "block";
               showNpToast("Password reset instructions sent to your email!");
            } else {
               showNpToast(
                  "Failed: " +
                     (result.data.message || "Unable to process request."),
               );
            }
         })
         .catch(function (error) {
            console.error("Forgot Password Error:", error);
            isLoading = false;
            stopLoading();
            showNpToast("Something went wrong. Please try again.");
         });
   });

   //! "Back to Login" link click — go back to login form
   const forgotBackToLogin = document.getElementById("forgotBackToLogin");
   forgotBackToLogin.addEventListener("click", function () {
      forgotPassForm.style.display = "none";
      // Reset the form and success message for next time
      forgotFormTag.reset();
      forgotFormTag.style.display = "block";
      forgotPassSuccess.style.display = "none";
      stepTwoForm.style.display = "block";
   });
});

// ========================================
//              Step 3 signup Form
// ========================================
document.addEventListener("DOMContentLoaded", function () {
   const stepThreeForm = document.getElementById("stepThreeForm");
   const stepThreeFormTag = stepThreeForm.querySelector("form");
   const stepThreeEmail = document.getElementById("nps_three_email");
   const stepThreePw = document.getElementById("nps_three_pw");
   const stepThreeFname = document.getElementById("nps_three_fname");
   const stepThreeLname = document.getElementById("nps_three_lname");
   const stepThreeSubmitBtn = document.getElementById("nps_three_submit");
   const stepFourForm = document.getElementById("stepFourForm");

   let isLoading = false;
   stepThreeFormTag.addEventListener("submit", function (e) {
      e.preventDefault();
      if (isLoading) return;
      const email = stepThreeEmail.value.trim();
      const password = stepThreePw.value;
      const firstName = stepThreeFname.value.trim();
      const lastName = stepThreeLname.value.trim();
      if (!email || !password) {
         return;
      }

      // Phone validation (intlTelInput plugin — required)
      if (window.itiPopup && window.itiPopup.isValidNumber()) {
         var internationalNumber = window.itiPopup.getNumber(
            window.intlTelInputUtils.numberFormat.E164,
         );
      } else {
         showNpToast("Please enter a valid phone number.");
         return;
      }

      isLoading = true;
      const stopLoading = startButtonLoading(stepThreeSubmitBtn);

      // Step 1: Validate email + phone via Abstract API
      fetch(
         "https://operators-dashboard.bubbleapps.io/api/1.1/wf/email_phone_verification",
         {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({
               email: email,
               phone: internationalNumber,
            }),
         },
      )
         .then(function (response) {
            return response.json();
         })
         .then(function (verifyData) {
            // Phone validation
            if (internationalNumber && !verifyData.response.phone_valid) {
               showNpToast("Please enter a valid phone number.");
               isLoading = false;
               stopLoading();
               return;
            }
            // Email validation
            if (
               verifyData.response.email_status !== "DELIVERABLE" ||
               verifyData.response.disposable_email === true
            ) {
               showNpToast("Please enter a valid email.");
               isLoading = false;
               stopLoading();
               return;
            }

            // Signup API call
            return fetch(
               "https://operators-dashboard.bubbleapps.io/api/1.1/wf/webflow_signup",
               {
                  method: "POST",
                  headers: {
                     "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                     email: email,
                     password: password,
                     phone: internationalNumber,
                     firstname: firstName,
                     lastname: lastName,
                  }),
               },
            )
               .then(function (response) {
                  return response.json().then(function (data) {
                     return { ok: response.ok, data: data };
                  });
               })
               .then(function (result) {
                  isLoading = false;
                  stopLoading();
                  if (result.ok) {
                     Cookies.set("userEmail", email, {
                        expires: 7,
                        secure: true,
                     });
                     if (result.data.response && result.data.response.token) {
                        Cookies.set("authToken", result.data.response.token, {
                           expires: 7,
                           secure: true,
                        });
                     }
                     localStorage.setItem("new_user", "true");
                     if (
                        typeof tatari !== "undefined" &&
                        result.data.response &&
                        result.data.response.user_id
                     ) {
                        tatari.identify(result.data.response.user_id);
                        tatari.track("Sign Up", {
                           user_id: result.data.response.user_id,
                        });
                     }
                     if (typeof updateKlaviyoTrackingFromAPI === "function") {
                        updateKlaviyoTrackingFromAPI(result.data);
                     }
                     if (typeof updateUIForLoggedInUser === "function") {
                        updateUIForLoggedInUser(email);
                     }
                     window.dispatchEvent(new Event("loginSuccess"));
                     if (typeof sendFlightRequestIdsIfLoggedIn === "function") {
                        sendFlightRequestIdsIfLoggedIn();
                     }
                     showNpToast("Signup successful!");
                     stepThreeFormTag.reset();
                     stepThreeForm.style.display = "none";
                     stepFourForm.style.display = "block";
                  } else {
                     showNpToast(
                        "Signup failed: " +
                           (result.data.message || "Unknown error"),
                     );
                  }
               });
         })
         .catch(function (error) {
            console.error("Signup Error:", error);
            isLoading = false;
            stopLoading();
            showNpToast("An error occurred during signup. Please try again.");
         });
   });

   //! Password eye toggle (step 3)
   const pwEyeThreeBtn = document.getElementById("pweyeThree");
   const pwEyeThreeImg = pwEyeThreeBtn.querySelector("img");
   const eyeOpenSrc =
      "https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6a4f765ca44c6e29b6965b8d_eye.svg";
   const eyeClosedSrc =
      "https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6a4f765c5f99d0ccd22fb246_eye-off.svg";
   pwEyeThreeBtn.addEventListener("click", function () {
      if (stepThreePw.type === "password") {
         stepThreePw.type = "text";
         pwEyeThreeImg.src = eyeClosedSrc;
      } else {
         stepThreePw.type = "password";
         pwEyeThreeImg.src = eyeOpenSrc;
      }
   });

   //! "Login" link click from Step 3 — show step 2 (login form)
   const stepThreeLogin = document.getElementById("stepThreeLogin");
   stepThreeLogin.addEventListener("click", function () {
      stepThreeForm.style.display = "none";
      const stepTwoForm = document.getElementById("stepTwoForm");
      stepTwoForm.style.display = "block";
   });
});

// ========================================
//      Step 4 Personalize Results Form
// ========================================
document.addEventListener("DOMContentLoaded", function () {
   const stepFourForm = document.getElementById("stepFourForm");
   const stepFourFormTag = stepFourForm.querySelector("form");
   const stepFourSubmitBtn = document.getElementById("nps_four_submit");
   const finalPopup = document.getElementById("finalPopup");
   const newPopupWrapper = document.querySelector(".new_popup_wrapper");

   // Checkbox value → API parameter mapping
   var cabinMap = {
      Turboprop: "turboprop",
      Light: "light",
      Mid: "midsize",
      "Super Mid": "supermid",
      Heavy: "heavy",
   };
   var interestMap = {
      Charter: "charterinterest",
      "Jet Card": "jetcardinterest",
      "Empty Legs": "emptylegsinterest",
      "Whole Ownership": "ownershipinterest",
      "Fractional Ownership": "fractionalinterest",
   };

   function getCheckedValues(name) {
      var checked = [];
      stepFourForm
         .querySelectorAll('input[name="' + name + '"]:checked')
         .forEach(function (el) {
            checked.push(el.value);
         });
      return checked;
   }

   let isLoading = false;
   stepFourFormTag.addEventListener("submit", function (e) {
      e.preventDefault();
      if (isLoading) return;
      isLoading = true;
      const stopLoading = startButtonLoading(stepFourSubmitBtn);

      // Build API body
      var body = {};

      // Cabin preferences → yes/no
      var selectedCabins = getCheckedValues("cabin_preference");
      Object.keys(cabinMap).forEach(function (key) {
         body[cabinMap[key]] =
            selectedCabins.indexOf(key) !== -1 ? "yes" : "no";
      });

      // Interest → yes/no
      var selectedInterests = getCheckedValues("interest");
      Object.keys(interestMap).forEach(function (key) {
         body[interestMap[key]] =
            selectedInterests.indexOf(key) !== -1 ? "yes" : "no";
      });

      // Frequency (radio)
      var frequencyRadio = stepFourForm.querySelector(
         'input[name="flight_frequency"]:checked',
      );
      body.frequency = frequencyRadio ? frequencyRadio.value : "1";

      var authToken = Cookies.get("authToken") || "";
      fetch(
         "https://operators-dashboard.bubbleapps.io/api/1.1/wf/set_client_signup_preferences",
         {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
               Authorization: "Bearer " + authToken,
            },
            body: JSON.stringify(body),
         },
      )
         .then(function (response) {
            return response.json().then(function (data) {
               return { ok: response.ok, data: data };
            });
         })
         .then(function (result) {
            isLoading = false;
            stopLoading();
            if (result.ok) {
               showNpToast("Preferences saved!");
               stepFourForm.style.display = "none";
               newPopupWrapper.style.display = "none";
               finalPopup.style.display = "block";
               // Auto-hide popup after 2 seconds
               window._autoHidePopupTimer = setTimeout(function () {
                  hideNewPopup();
               }, 2000);
            } else {
               showNpToast("Failed to save preferences. Please try again.");
            }
         })
         .catch(function (error) {
            console.error("Preferences Error:", error);
            isLoading = false;
            stopLoading();
            showNpToast("Something went wrong. Please try again.");
         });
   });

   //! "Skip For Now" button
   const skipBtn = document.getElementById("skipStepFour");
   skipBtn.addEventListener("click", function () {
      stepFourForm.style.display = "none";
      newPopupWrapper.style.display = "none";
      finalPopup.style.display = "block";
      // Auto-hide popup after 2 seconds
      window._autoHidePopupTimer = setTimeout(function () {
         hideNewPopup();
      }, 2000);
   });

   //! "COMPARE OPTIONS" button — close entire popup
   const finalBtn = document.getElementById("final_btn");
   finalBtn.addEventListener("click", function () {
      // Clear auto-hide timer if user clicks manually
      if (window._autoHidePopupTimer) clearTimeout(window._autoHidePopupTimer);
      hideNewPopup();
   });
});

//!===========================================================
//!           New mulitstep form popup code End
//! ===========================================================
