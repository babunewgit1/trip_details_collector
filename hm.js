// -- popup code start --

(function () {
   function initSearchWidget(root) {
      if (root._searchInitialized) return;
      root._searchInitialized = true;

      var searchClient = algoliasearch(
         "ZSPO7HB4MN",
         "2a3621a18dca4f1fb757e9ddaea72440",
      );
      var index = searchClient.initIndex("Airports");

      // ── Utilities ────────────────────────────────────────────────────────
      function debounce(fn, delay) {
         var t;
         return function () {
            var args = arguments,
               ctx = this;
            clearTimeout(t);
            t = setTimeout(function () {
               fn.apply(ctx, args);
            }, delay);
         };
      }

      function escapeHTML(str) {
         var d = document.createElement("div");
         d.appendChild(document.createTextNode(str));
         return d.innerHTML;
      }

      function getUnixTimestamp(dateStr, timeStr) {
         return Math.floor(
            new Date(dateStr + "T" + (timeStr || "00:00:00")).getTime(),
         );
      }

      function saveRecentSearch(data) {
         var list = JSON.parse(localStorage.getItem("recentSearch") || "[]");
         list.unshift(data);
         if (list.length > 5) list = list.slice(0, 5);
         localStorage.setItem("recentSearch", JSON.stringify(list));
      }

      function clearStorage() {
         if (localStorage.getItem("aircraft_details"))
            localStorage.removeItem("aircraft_details");
      }

      function getAircraftType(btn) {
         var parent =
            btn.closest(".tab_cnt_item") ||
            btn.closest(".algolio_submit") ||
            btn.closest(".hmtrip") ||
            document;
         var scope = parent;
         if (parent.classList && parent.classList.contains("algolio_submit")) {
            scope = parent.parentElement || parent;
         }

         var checked = scope.querySelector(".aircraft_radio:checked");
         return checked ? checked.value : "airplane";
      }

      // ── PAX block ────────────────────────────────────────────────────────
      function initPax(wrapper) {
         if (wrapper._paxInitialized) return;
         wrapper._paxInitialized = true;

         var minus = wrapper.querySelector(".empax_minus");
         var plus = wrapper.querySelector(".empax_plus");
         var input = wrapper.querySelector(".expaxinput");

         if (
            !input.value ||
            isNaN(parseInt(input.value)) ||
            parseInt(input.value) < 0
         )
            input.value = "0";
         if (parseInt(input.value) <= 0) minus.classList.add("disabled");

         plus.addEventListener("click", function () {
            var v = (parseInt(input.value) || 0) + 1;
            input.value = v;
            minus.classList.remove("disabled");
         });
         minus.addEventListener("click", function () {
            var v = parseInt(input.value) || 0;
            if (v > 0) {
               input.value = --v;
               if (v <= 0) minus.classList.add("disabled");
            }
         });
      }

      root.querySelectorAll(".empax_wrapper").forEach(initPax);

      // ── Algolia search ───────────────────────────────────────────────────
      function handleInput(event) {
         var input = event.target;
         if (!input.classList.contains("algolio_input")) return;
         var query = input.value.trim();
         var block = input.closest(".eminputblock");
         var results = block && block.querySelector(".search-results");
         if (!results) return;
         if (!query) {
            results.innerHTML = "";
            results.style.display = "none";
            return;
         }

         index
            .search(query)
            .then(function (res) {
               if (res.hits.length) {
                  results.innerHTML = res.hits
                     .map(function (hit) {
                        return (
                           '<div class="port" tabindex="0"><div class="emfieldnamewrapper">' +
                           '<img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6739f54808efbe5ead7a23c1_Screenshot_1-removebg-preview.avif" alt="Location Icon">' +
                           '<p class="emfieldname">' +
                           escapeHTML(hit["All Fields"]) +
                           "</p>" +
                           '<p class="uniqueid">' +
                           escapeHTML(hit["unique id"]) +
                           "</p>" +
                           '<p class="shortname">' +
                           escapeHTML(hit["AirportNameShort"]) +
                           "</p>" +
                           "</div></div>"
                        );
                     })
                     .join("");
                  results.style.display = "block";
               } else {
                  results.innerHTML = "<p>No results found.</p>";
                  results.style.display = "block";
               }
            })
            .catch(function () {
               results.innerHTML = "<p>Error fetching results.</p>";
               results.style.display = "block";
            });
      }

      function handlePortClick(event) {
         var port = event.target.closest(".port");
         if (!port) return;
         var block = port.closest(".eminputblock");
         block.querySelector(".algolio_input").value =
            port.querySelector(".emfieldname").textContent;
         block.querySelector(".portid").textContent =
            port.querySelector(".uniqueid").textContent;
         block.querySelector(".short_name").textContent =
            port.querySelector(".shortname").textContent;
         var res = block.querySelector(".search-results");
         res.innerHTML = "";
         res.style.display = "none";
      }

      function closeAllResults(wrapper) {
         wrapper.querySelectorAll(".search-results").forEach(function (r) {
            r.innerHTML = "";
            r.style.display = "none";
         });
      }

      var debouncedInput = debounce(handleInput, 300);

      function attachAlgolioListeners(wrapper) {
         if (wrapper._algolioListeners) return;
         wrapper._algolioListeners = true;
         wrapper.addEventListener("input", debouncedInput);
         wrapper.addEventListener("click", handlePortClick);
         wrapper.addEventListener("focusout", function (e) {
            setTimeout(function () {
               if (!e.relatedTarget || !wrapper.contains(e.relatedTarget))
                  closeAllResults(wrapper);
            }, 100);
         });
      }

      root.querySelectorAll(".algolio_wrapper").forEach(attachAlgolioListeners);

      document.addEventListener("click", function (e) {
         if (!root.contains(e.target)) closeAllResults(root);
      });

      // ── Multi-city: Add leg ───────────────────────────────────────────────
      var addBtn = root.querySelector(".emsubmit.add-search-input");
      if (addBtn) {
         addBtn.addEventListener("click", function () {
            var algolioWrapper = root.querySelector(
               ".algolio_wrapper.removeadded",
            );
            var numForms =
               algolioWrapper.querySelectorAll(".algolio_length").length;

            if (numForms > 9) {
               addBtn.classList.add("noentry");
               addBtn.querySelector("span").textContent =
                  "You can not add more than 10";
               return;
            }

            var newForm = document.createElement("form");
            newForm.className = "algolio_length";
            newForm.setAttribute("autocomplete", "off");
            newForm.innerHTML =
               '<div class="emform generated">' +
               '<div class="eminputblock"><label>From</label><div class="eminput_field">' +
               '<input class="algolio_input multicityform" type="text">' +
               '<p class="portid multicityformid"></p>' +
               '<p class="short_name multiway_fromshort_name"></p>' +
               '<img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6730586b420dae5eaf21e2eb_gps.png" alt="GPS Icon">' +
               '</div><div class="search-results"></div></div>' +
               '<div class="eminputblock"><label>To</label><div class="eminput_field">' +
               '<input class="algolio_input multicityto" type="text">' +
               '<p class="portid multicitytoid"></p>' +
               '<p class="short_name multiway_toshort_name"></p>' +
               '<img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6730586b420dae5eaf21e2eb_gps.png" alt="GPS Icon">' +
               '</div><div class="search-results"></div></div>' +
               '<div class="eminputblock"><label>Date</label><div class="eminput_field">' +
               '<input class="multicitydate" type="date"></div></div>' +
               '<div class="eminputblock"><label>PAX</label><div class="eminput_field">' +
               '<div class="empax_wrapper"><div class="empax_minus disabled">-</div>' +
               '<input class="expaxinput multicitypax" type="text" value="1" readonly>' +
               '<div class="empax_plus">+</div></div></div></div>' +
               '<div class="remove"><img src="https://cdn.prod.website-files.com/6713759f858863c516dbaa19/6766e051a4e47b7d94159c59_x-square.svg" alt=""></div>' +
               "</div>";

            algolioWrapper.appendChild(newForm);
            newForm.querySelectorAll(".empax_wrapper").forEach(initPax);
         });

         // Remove leg — delegate on the same removeadded wrapper
         var removeWrapper = root.querySelector(".algolio_wrapper.removeadded");
         if (removeWrapper) {
            removeWrapper.addEventListener("click", function (e) {
               var removeBtn = e.target.closest(".remove");
               if (!removeBtn) return;
               var leg = removeBtn.closest(".algolio_length");
               if (leg) leg.remove();
               var remaining =
                  removeWrapper.querySelectorAll(".algolio_length").length;
               if (remaining <= 10) {
                  addBtn.classList.remove("noentry");
                  addBtn.querySelector("span").textContent = "ADD LEG";
               }
            });
         }
      }

      // ── Submit: One Way ──────────────────────────────────────────────────
      var owBtn = root.querySelector(".onewaysubmit");
      if (owBtn) {
         owBtn.addEventListener("click", function () {
            var w = owBtn.closest(".hmtrip");
            var formIdInput = w.querySelector("input.onewayform").value;
            var toIdInput = w.querySelector("input.onewayto").value;
            var fromId = w.querySelector(".onewayformid").textContent;
            var toId = w.querySelector(".onewaytoid").textContent;
            var dateAsText = w.querySelector(".onewaydate").value;
            var pax = w.querySelector(".onewaypax").value;
            var fromShortName = w.querySelector(
               ".oneway_fromshort_name",
            ).textContent;
            var toShortName = w.querySelector(
               ".oneway_toshort_name",
            ).textContent;

            if (
               fromId &&
               toId &&
               dateAsText &&
               pax &&
               formIdInput &&
               toIdInput &&
               fromShortName &&
               toShortName
            ) {
               var data = {
                  way: "one way",
                  fromId: fromId,
                  toId: toId,
                  dateAsText: dateAsText,
                  timeAsText: "00:00:00",
                  pax: pax,
                  appDate: dateAsText,
                  timeStamp: getUnixTimestamp(dateAsText),
                  formIdInput: formIdInput,
                  toIdInput: toIdInput,
                  fromShortName: fromShortName,
                  toShortName: toShortName,
                  isFromNearby: "No",
                  isToNearby: "No",
                  trip_classification: getAircraftType(owBtn),
               };
               saveRecentSearch(data);
               sessionStorage.setItem("storeData", JSON.stringify(data));
               clearStorage();
               window.location.href = "/aircraft";
            } else {
               alert("Please fill up the form properly");
            }
         });
      }

      // ── Submit: Round Trip ───────────────────────────────────────────────
      var rtBtn = root.querySelector(".roundtrip");
      if (rtBtn) {
         rtBtn.addEventListener("click", function () {
            var w = rtBtn.closest(".hmtrip");
            var formIdInput = w.querySelector(".rfrom").value;
            var toIdInput = w.querySelector(".rto").value;
            var fromId = w.querySelector(".roundfromid").textContent;
            var toId = w.querySelector(".roundtoid").textContent;
            var dateAsText = w.querySelector(".rdepdate").value;
            var returnDate = w.querySelector(".rretdate").value;
            var pax = w.querySelector(".rpax").value;
            var fromShortName = w.querySelector(
               ".roundway_fromshort_name",
            ).textContent;
            var toShortName = w.querySelector(
               ".roundway_toshort_name",
            ).textContent;

            if (
               formIdInput &&
               toIdInput &&
               dateAsText &&
               returnDate &&
               pax &&
               fromShortName &&
               toShortName
            ) {
               var data = {
                  way: "round trip",
                  formIdInput: formIdInput,
                  toIdInput: toIdInput,
                  fromInputReturn: toIdInput,
                  toInputReturn: formIdInput,
                  fromId: fromId,
                  toId: toId,
                  returnFromId: toId,
                  returnToId: fromId,
                  dateAsText: dateAsText,
                  returnDateAsText: returnDate,
                  timeAsText: "00:00:00",
                  timeAsTextReturn: "00:00:00",
                  pax: pax,
                  paxReturn: pax,
                  appDate: dateAsText,
                  appDateReturn: returnDate,
                  timeStamp: getUnixTimestamp(dateAsText),
                  timeStampReturn: getUnixTimestamp(returnDate),
                  fromShortName: fromShortName,
                  toShortName: toShortName,
                  isFromNearby: "No",
                  isToNearby: "No",
                  trip_classification: getAircraftType(rtBtn),
               };
               saveRecentSearch(data);
               sessionStorage.setItem("storeData", JSON.stringify(data));
               clearStorage();
               window.location.href = "/aircraft";
            } else {
               alert("Please fill up the form properly");
            }
         });
      }

      // ── Submit: Multi-city ───────────────────────────────────────────────
      var mcBtn = root.querySelector(".multicity_submit");
      if (mcBtn) {
         mcBtn.addEventListener("click", function () {
            var w = mcBtn.closest(".hmtrip");
            var ok = true;
            var sFormPort = [],
               sToPort = [],
               sFormId = [],
               sToId = [];
            var sDate = [],
               sTime = [],
               sPax = [],
               sFromSN = [],
               sToSN = [],
               sUnix = [];

            function collect(sel, arr, key) {
               w.querySelectorAll(sel).forEach(function (el) {
                  var val = key === "text" ? el.textContent : el.value;
                  val ? arr.push(val) : (ok = false);
               });
            }

            collect(".multicityform", sFormPort, "val");
            collect(".multicityto", sToPort, "val");
            collect(".multicityformid", sFormId, "text");
            collect(".multicitytoid", sToId, "text");
            collect(".multicitypax", sPax, "val");
            collect(".multiway_fromshort_name", sFromSN, "text");
            collect(".multiway_toshort_name", sToSN, "text");

            w.querySelectorAll(".multicitydate").forEach(function (i) {
               if (i.value) {
                  sDate.push(i.value);
                  sTime.push("00:00:00");
                  sUnix.push(getUnixTimestamp(i.value));
               } else {
                  ok = false;
               }
            });

            if (ok) {
               var data = {
                  way: "multi-city",
                  fromId: sFormId,
                  toId: sToId,
                  dateAsText: sDate,
                  timeAsText: sTime,
                  pax: sPax,
                  appDate: sDate,
                  timeStamp: sUnix,
                  formIdInput: sFormPort,
                  toIdInput: sToPort,
                  fromShortName: sFromSN,
                  toShortName: sToSN,
                  trip_classification: getAircraftType(mcBtn),
               };
               sessionStorage.setItem("storeData", JSON.stringify(data));
               clearStorage();
               window.location.href = "/aircraft";
            } else {
               alert("Please fill up the form properly.");
            }
         });
      }
   }

   // ── Bootstrap ─────────────────────────────────────────────────────────────
   // Initialise every .hmtrip found now or added later (covers both page bars and popups)
   function scanAndInit(scope) {
      (scope || document).querySelectorAll(".hmtrip").forEach(initSearchWidget);
   }

   document.addEventListener("DOMContentLoaded", function () {
      scanAndInit();
   });

   new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
         // Webflow shows popup by toggling style/class — re-scan its .hmtrip children
         if (mutation.type === "attributes") {
            mutation.target.querySelectorAll && scanAndInit(mutation.target);
         }
         mutation.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            scanAndInit(node);
            if (node.classList && node.classList.contains("hmtrip"))
               initSearchWidget(node);
         });
      });
   }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
   });
})();
