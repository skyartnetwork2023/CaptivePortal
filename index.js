var NO_AUTH = 0,
    SIMPLE_PASSWORD = 1,
    EXTERNAL_RADIUS = 2,
    HOTSPOT = 11,
    EXTERNAL_LDAP = 15;

var VOUCHER_ACCESS_TYPE = 3,
    LOCAL_USER_ACCESS_TYPE = 5,
    SMS_ACCESS_TYPE = 6,
    RADIUS_ACCESS_TYPE = 8,
    FORM_AUTH_ACCESS_TYPE = 12;

var MAX_INPUT_LEN = 2000;

// Scenes for the animated hero background; swap the sources to match venue imagery.
var BACKGROUND_SLIDES = [
  { source: "background.png", caption: "Sunrise lobby" },
  { source: "linear-gradient(120deg,#031625,#0b3b5b,#0f768d)", caption: "Harbor atrium" },
  { source: "linear-gradient(130deg,#1c0f33,#421563,#6f2dbd)", caption: "Evening lounge" },
  { source: "linear-gradient(150deg,#041c32,#04293a,#064663)", caption: "City skyline" }
];

// Rotating sponsor/ad placements rendered in the right rail.
var PORTAL_ADS = BACKGROUND_SLIDES.map(function(slide, idx) {
  return {
    eyebrow: "Scene " + (idx + 1),
    title: slide.caption || "Portal Scene",
    body: "Enjoy our rotating venue scenes.",
    cta: "",
    link: "#",
    background: slide.source
  };
});

var experienceLayersBootstrapped = false;
var supabaseConfig = (typeof window !== "undefined" && window.__SUPABASE_CONFIG__) || {};
var supabaseClient = null;

var Ajax = {
    post: function (url, data, fn) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status == 304)) {
                fn.call(this, xhr.responseText);
            }
        };
        xhr.send(data);
    }
};
var data = {};
var globalConfig = {};
var submitUrl;
var clientMac = getQueryStringKey("clientMac");
var apMac = getQueryStringKey("apMac");
var gatewayMac = getQueryStringKey("gatewayMac") || undefined;
var ssidName = getQueryStringKey("ssidName") || undefined;
var radioId = !!getQueryStringKey("radioId")? Number(getQueryStringKey("radioId")) : undefined;
var vid = !!getQueryStringKey("vid")? Number(getQueryStringKey("vid")) : undefined;
var originUrl = getQueryStringKey("originUrl");
var previewSite = getQueryStringKey("previewSite");
var portalApiBase = (typeof window !== "undefined" && (window.__OMADA_PORTAL_BASE__ || getQueryStringKey("apiBase") || getQueryStringKey("controllerUrl"))) || "";

var hotspotMap = {
    3: "Voucher Access",
    5: "Local User Access",
    6: "SMS Access",
    8: "RADIUS Access",
    12: "Form Auth Access"
};

var errorHintMap = {
    "0": "ok",
    "-1": "General error.",
    "-41500": "Invalid authentication type.",
    "-41501": "Failed to authenticate.",
    "-41502": "Voucher code is incorrect. (Vocha si sahihi aise)",
    "-41503": "Voucher is expired. (Vocha Imeisha💔😢)",
    "-41504": "Voucher traffic has exceeded the limit.",
    "-41505": "The number of users has reached the limit. (Idadi ya watumiaji imefika kikomo👮)",
    "-41506": "Invalid authorization information.",
    "-41507": "Your authentication times out. You can get authenticated again until the next day.",
    "-41508": "Local User traffic has exceeded the limit.",
    "-41512": "Local User is expired.",
    "-41513": "Local User is disabled.",
    "-41514": "MAC address is incorrect.",
    "-41515": "Local User Quota has exceeded the limit.",
    "-41516": "The number of users has reached the limit. (Idadi ya watumiaji imefika kikomo👮)",
    "-41517": "Incorrect password.",
    "-41518": "This SSID does not exist.",
    "-41519": "Invalid code.",
    "-41520": "The code is expired.",
    "-41521": "The number of users has reached the limit. (Idadi ya watumiaji imefika kikomo👮)",
    "-41522": "Failed to validate the code.",
    "-41523": "Failed to send verification code.",
    "-41524": "Authentication failed because the username does not exist.",
    "-41525": "Authentication failed because of wrong password.",
    "-41526": "Authentication failed because the client is invalid.",
    "-41527": "Authentication failed because the local user is invalid.",
    "-41528": "Failed to decrypt data.",
    "-41529": "Incorrect username or password.",
    "-41530": "Connecting to the RADIUS server times out.",
    "-41531": "Your code have reached your Wi-Fi data limit.",
    "-41532": "Your account have reached your Wi-Fi data limit.",
    "-41533": "Form authentication request is invalid.",
    "-43408": "Invalid LDAP configuration.",
    "-43409": "Invalid LDAP credentials.",
    "-41538": "Voucher is not effective."
};

var isCommited;
var formAuthController = useFormAuthController()

function setElementDisplay(id, displayStyle) {
  var el = document.getElementById(id);
  if (el) {
    el.style.display = displayStyle;
  }
}

function showElementBlock(id) {
  setElementDisplay(id, "block");
}

function hideElementBlock(id) {
  setElementDisplay(id, "none");
}

function getQueryStringKey (key) {
    return getQueryStringAsObject()[key];
}
function getQueryStringAsObject () {
    var b, cv, e, k, ma, sk, v, r = {},
        d = function (v) { return decodeURIComponent(v); }, //# d(ecode) the v(alue)
        q = window.location.search.substring(1), //# suggested: q = decodeURIComponent(window.location.search.substring(1)),
        s = /([^&;=]+)=?([^&;]*)/g //# original regex that does not allow for ; as a delimiter:   /([^&=]+)=?([^&]*)/g
    ;
    ma = function(v) {
        if (typeof v != "object") {
            cv = v;
            v = {};
            v.length = 0;
            if (cv) { Array.prototype.push.call(v, cv); }
        }
        return v;
    };
    while (e = s.exec(q)) {
        b = e[1].indexOf("[");
        v = d(e[2]);
        if (b < 0) {
            k = d(e[1]);
            if (r[k]) {
                r[k] = ma(r[k]);
                Array.prototype.push.call(r[k], v);
            }
            else {
                r[k] = v;
            }
        }
        else {
            k = d(e[1].slice(0, b));
            sk = d(e[1].slice(b + 1, e[1].indexOf("]", b)));
            r[k] = ma(r[k]);
            if (sk) { r[k][sk] = v; }
            else { Array.prototype.push.call(r[k], v); }
        }
    }
    return r;
}
function withPortalBase(path) {
  if (!portalApiBase) {
    return path;
  }
  if (/^https?:/i.test(path)) {
    return path;
  }
  var sanitizedBase = portalApiBase.replace(/\/$/, "");
  return sanitizedBase + path;
}
Ajax.post(
  withPortalBase('/portal/getPortalPageSetting'),
    JSON.stringify({
        "clientMac": clientMac,
        "apMac": apMac,
        "gatewayMac": gatewayMac,
        "ssidName": ssidName,
        "radioId": radioId,
        "vid": vid,
        "originUrl": originUrl
    }),
    function (res) {
        res = JSON.parse(res);
        data = res.result;
        submitUrl           = withPortalBase("/portal/auth");
        var landingUrl  = data.landingUrl;
        isCommited          = false;
        globalConfig = {
            authType: data.authType,
            hotspotTypes: !!data.hotspot && data.hotspot.enabledTypes || [],
            buttonText: data.portalCustomize.buttonText || 'Log In',
            formAuthButtonText: data.portalCustomize.formAuthButtonText || 'Take the Survey',
            formAuth: data.formAuth || {},
            error         : data.error || 'ok',
            countryCode   : !!data.sms && data.sms.countryCode || 1
        };
        function pageConfigParse(){
          var operHint = document.getElementById("oper-hint");
          if (res.errorCode !== 0 && operHint){
            operHint.style.display = "block";
            operHint.innerHTML = errorHintMap[res.errorCode];
          }
          hideElementBlock("hotspot-section");
          hideElementBlock("input-voucher");
          hideElementBlock("input-user");
          hideElementBlock("input-password");
          hideElementBlock("input-simple");
          hideElementBlock("input-phone-num");
          hideElementBlock("input-verify-code");
            switch (globalConfig.authType){
                case NO_AUTH:
                    window.authType = 0;
                    break;
                case SIMPLE_PASSWORD:
              showElementBlock("input-simple");
                    window.authType = 1;
                    break;
                case EXTERNAL_RADIUS:
                    hotspotChang(2);
                    window.authType = 2;
                    break;
                case EXTERNAL_LDAP:
                    hotspotChang(15);
                    window.authType = 15;
                    break;
                case HOTSPOT:
                    document.getElementById("hotspot-section").style.display = "block";
                    var options = "";
                    for (var i=0;i<globalConfig.hotspotTypes.length;i++) {
                        options += '<option value="'+globalConfig.hotspotTypes[i]+'">'+hotspotMap[globalConfig.hotspotTypes[i]]+'</option>';
                    }
                    document.getElementById("hotspot-selector").innerHTML = options;
                    hotspotChang(globalConfig.hotspotTypes[0]);
                    window.authType = globalConfig.hotspotTypes[0];
                    break;
            }
                enforceVoucherOnlyMode();
        }

        function handleSubmit(){
            var submitData = {};
            submitData['authType'] = window.authType;
            switch (window.authType){
                case 3:
                    submitData['voucherCode'] = document.getElementById("voucherCode").value;
                    break;
                case 5:
                    submitData['localuser'] = document.getElementById("username").value;
                    submitData['localuserPsw'] = document.getElementById("password").value;
                    break;
                case 1:
                    submitData['simplePassword'] = document.getElementById("simplePassword").value;
                    break;
                case 0:
                    break;
                case 6:
                    submitData['phone'] = "+"+document.getElementById("country-code").value + document.getElementById("phone-number").value;
                    submitData['code'] = document.getElementById("verify-code").value;
                    break;
                case 2:
                case 8:
                    submitData['username'] = document.getElementById("username").value;
                    submitData['password'] = document.getElementById("password").value;
                    break;
                case 15:
                  submitData['ldapUsername'] = document.getElementById("username").value;
                  submitData['ldapPassword'] = document.getElementById("password").value;
                  break;
                case FORM_AUTH_ACCESS_TYPE:
                  $.extend(submitData, formAuthController.getAuthData());
                default:
                    break;
            }

            if(isCommited == false){
                submitData['clientMac'] = clientMac;
                submitData['apMac'] = apMac;
                submitData['gatewayMac'] = gatewayMac;
                submitData['ssidName'] = ssidName;
                submitData['radioId'] = radioId;
                submitData['vid'] = vid;
                if(window.authType == 2 || window.authType == 8 || window.authType === 15){
                    if(window.authType === 15) {
                          submitUrl = withPortalBase('/portal/ldap/auth');
                    } else {
                          submitUrl = withPortalBase("/portal/radius/auth");
                    }
                    submitData['authType'] = window.authType;
                } else {
                    submitData['originUrl'] = originUrl;
                }
                function doAuth () {
                    Ajax.post(submitUrl, JSON.stringify(submitData).toString(), function(data){
                        data = JSON.parse(data);
                        if(!!data && data.errorCode === 0) {
                          isCommited = true;
                          landingUrl = data.result || landingUrl;
                          // Only redirect if landingUrl is set and not the original portal page
                          if (landingUrl && !/index\.html/i.test(landingUrl)) {
                            window.location.href = landingUrl;
                          } else {
                            // Stay on portal page, show success
                            document.getElementById("oper-hint").innerHTML = "Hongera!!!🎉 Umefanikiwa kuunga Internet Furahia Mtandao👍.";
                          }
                        } else {
                          document.getElementById("oper-hint").innerHTML = errorHintMap[data.errorCode];
                        }
                    });
                }
                doAuth();
            }
        }
        function hotspotChang (type) {
          hideElementBlock("input-voucher");
          hideElementBlock("input-user");
          hideElementBlock("input-password");
          hideElementBlock("input-phone-num");
          hideElementBlock("input-verify-code");
          showElementBlock("button-login");

          window.authType = Number(type);
          if (window.authType !== VOUCHER_ACCESS_TYPE) {
            window.authType = VOUCHER_ACCESS_TYPE;
          }

          showElementBlock("input-voucher");
          setNormalButton();
        }

        function enforceVoucherOnlyMode() {
          hideElementBlock("hotspot-section");
          hideElementBlock("input-user");
          hideElementBlock("input-password");
          hideElementBlock("input-simple");
          hideElementBlock("input-phone-num");
          hideElementBlock("input-verify-code");
          showElementBlock("input-voucher");
          showElementBlock("button-login");

          window.authType = VOUCHER_ACCESS_TYPE;
          globalConfig.authType = VOUCHER_ACCESS_TYPE;
          globalConfig.hotspotTypes = [VOUCHER_ACCESS_TYPE];

          var hotspotSelector = document.getElementById("hotspot-selector");
          if (hotspotSelector) {
            hotspotSelector.innerHTML = '<option value="' + VOUCHER_ACCESS_TYPE + '">' + hotspotMap[VOUCHER_ACCESS_TYPE] + '</option>';
          }

          if (!globalConfig.buttonText || globalConfig.buttonText.toLowerCase() === 'log in') {
            globalConfig.buttonText = 'Redeem Voucher';
          }
          setNormalButton();
        }
        globalConfig.countryCode = "+" + parseInt(globalConfig.countryCode, 10);
        var countryCodeInput = document.getElementById("country-code");
        if (countryCodeInput) {
            countryCodeInput.value = parseInt(globalConfig.countryCode, 10);
        }
        var hotspotSelector = document.getElementById("hotspot-selector");
        if (hotspotSelector) {
            hotspotSelector.addEventListener("change", function () {
                var opt = hotspotSelector.options[hotspotSelector.selectedIndex];
                hotspotChang(opt.value);
            });
        }
        var loginButton = document.getElementById("button-login");
        if (loginButton) {
            loginButton.addEventListener("click", function () {
          if(window.authType === FORM_AUTH_ACCESS_TYPE) {
            formAuthController.showFormAuth(globalConfig);
          } else {
            handleSubmit();
          }
        });
        }
        $("#form-auth-submit").on("click", function () {formAuthController.submitFormAuth(handleSubmit)});
        var smsCodeButton = document.getElementById("get-code");
        if (smsCodeButton) {
          smsCodeButton.addEventListener("click", function(e){
            e.preventDefault();
            var phoneNum = document.getElementById("phone-number").value;
            function sendSmsAuthCode () {
                Ajax.post(withPortalBase("/portal/sendSmsAuthCode"),
                    JSON.stringify({
                        clientMac: clientMac,
                        apMac: apMac,
                        gatewayMac: gatewayMac,
                        ssidName: ssidName,
                        radioId: radioId,
                        vid: vid,
                        phone: "+" + document.getElementById("country-code").value + phoneNum
                    }),function(data){
                        data = JSON.parse(data);
                        if(data.errorCode !== 0){
                            document.getElementById("oper-hint").innerHTML = errorHintMap[data.errorCode];
                        } else {
                            document.getElementById("oper-hint").innerHTML = "SMS has been sent successfully.";
                        }
                    }
                );
            }
            sendSmsAuthCode();
            document.getElementById("oper-hint").innerHTML = "Sending Authorization Code...";
          });
          }
        pageConfigParse();
    }
);

function useFormAuthUtil () {
  function transferChoices(card) {
    var choices = [];
    $.each(card.choices, function (index, choice) {
      choices.push({
        value: index,
        text: choice
      });
    });
    if (card.others) {
      choices.push({
        value: choices.length,
        text: card.others
      });
    }
    return choices;
  }

  function getOthersHtml() {
    return '<div class="others-outer hidden"><input class="input" maxlength="'+MAX_INPUT_LEN+'" type="text" /></div>';
  }

  function getValidateHtml () {
    return '<div class="validate-outer hidden">This field cannot start with special characters + - @ =</div>'
  }

  function getRequiredHtml(text) {
    if (text) {
      return '<div class="required-outer hidden">' + text + '</div>';
    }
    return '';
  }

  function getCardContainer(cardIndex) {
    return $('#form-auth-content .card-container[card-index="' + cardIndex + '"]');
  }

  function getCardHtml(card, cardIndex, contentHtml) {
    return ('<div class="card-container"  card-index="' + cardIndex + '">' +
      '<div class="card-index">' + (cardIndex + 1) + '</div>' +
      '<div class="card-item-outer">' +
      '<div class="title">' + escapeHtml(card.title) + '</div>' +
      (contentHtml ? '<div class="content">' + contentHtml + '</div>' : '') +
      '</div>' +
      '</div>');
  }

  function getOthersValue(cardIndex) {
    var cardDom = getCardContainer(cardIndex);
    return cardDom.find('.others-outer input').val();
  }

  function toggleValideStatus(cardIndex, valid, isExportToExcelStr) {
    var cardDom = getCardContainer(cardIndex),
      requiredText = cardDom.find('.required-outer');

    var validateText = cardDom.find('.validate-outer');
    if (valid) {
      if(validateText) {
        validateText.addClass('hidden');
      }
      requiredText.addClass('hidden');
    } else {
      if(isExportToExcelStr) {
        requiredText.addClass('hidden');
        validateText.removeClass('hidden')
      } else {
        requiredText.removeClass('hidden');
      }
    }
  }

  return {
    transferChoices: transferChoices,
    getOthersHtml: getOthersHtml,
    getValidateHtml: getValidateHtml,
    getRequiredHtml: getRequiredHtml,
    getCardContainer: getCardContainer,
    getCardHtml: getCardHtml,
    getOthersValue: getOthersValue,
    toggleValideStatus: toggleValideStatus
  }
}

function useFormAuthController() {
  var formAuthUtil  = useFormAuthUtil()

  var SINGLE_CHOICE = 0,
      MULTIPLE_CHOICE = 1,
      COMBOBOX = 2,
      INPUT = 3,
      SCORE = 4,
      NOTE = 5;

  var CARD_MAP = {};
  CARD_MAP[SINGLE_CHOICE] = {
    render: function (card, cardIndex) {
      var choices = formAuthUtil.transferChoices(card);
      var options = '<div class="radio">';
      $.each(choices, function (index, choice) {
        options += ('<div class="choice-outer">' +
          '<label class="choice-item">' +
          '<input id="' + escapeHtml(card.title) + index + '" class="choice-input" type="radio" name="' + escapeHtml(card.title) + cardIndex + '" value="' + choice.value + '">' +
          '<span class="text">' + escapeHtml(choice.text) + '</span>' +
          '</label>' +
          '</div>');
      });
      options += '</div>';

      if (card.others) {
        options += formAuthUtil.getOthersHtml();
        options += formAuthUtil.getValidateHtml();
      }

      if (card.required) {
        options += formAuthUtil.getRequiredHtml('Please choose an answer.');
      }

      return formAuthUtil.getCardHtml(card, cardIndex, options);
    },
    getValue: function (card, cardIndex) {
      var cardDom = formAuthUtil.getCardContainer(cardIndex),
        checkbox = cardDom.find('input[type="radio"]'),
        othersVal = card.choices.length;

      var answer = {
        type: card.type
      };

      checkbox.each(function () {
        if ($(this).prop("checked")) {
          var val = parseInt($(this).val());
          if (val === othersVal) {
            answer.others = formAuthUtil.getOthersValue(cardIndex);
          } else {
            answer.choiceAnswer = [val];
          }
        }
      });

      return answer;
    },
    bindEvent: function (card, cardContainer) {
      var self = this,
        radios = cardContainer.find('input[type="radio"]');

      cardContainer.on('ev_valid', function () {
        self.validate(card, cardContainer.attr('card-index'));
      });

      radios.click(function () {
        cardContainer.trigger('ev_valid');
      });

      if (card.others) {
        var othersVal = card.choices.length,
          othersInput = cardContainer.find('.others-outer');

        radios.click(function () {
          if ($(this).prop("checked") && parseInt($(this).attr("value")) === othersVal) {
            othersInput.removeClass('hidden');
          } else {
            othersInput.addClass('hidden');
          }
        });
      }
    },
    validate: function (card, cardIndex) {
      var valid = !card.required,
        cardDom = formAuthUtil.getCardContainer(cardIndex);

      var radio = cardDom.find('input[type="radio"]:checked');
      var regex = /^[^+@=\-]/;

      if (radio.length > 0) {
        var isOthersRadio = parseInt(radio.val()) === card.choices.length;
        if(isOthersRadio && formAuthUtil.getOthersValue(cardIndex) && !regex.test(formAuthUtil.getOthersValue(cardIndex))) {
          formAuthUtil.toggleValideStatus(cardIndex, false, true);
          return false
        }

        if (card.required) {
          if(isOthersRadio && !formAuthUtil.getOthersValue(cardIndex)) {
            formAuthUtil.toggleValideStatus(cardIndex, false);
            return false
          }
        }
      } else {
        formAuthUtil.toggleValideStatus(cardIndex, valid);
        return valid
      }

      formAuthUtil.toggleValideStatus(cardIndex, true);
      return true;
    }
  };
  CARD_MAP[MULTIPLE_CHOICE] = {
    render: function (card, cardIndex) {
      var choices = formAuthUtil.transferChoices(card);
      var options = '<div class="checkbox">';
      $.each(choices, function (index, choice) {
        options += ('<div class="choice-outer">' +
          '<label class="choice-item">' +
          '<input id="' + escapeHtml(card.title) + index + '" class="choice-input" type="checkbox" name="' + escapeHtml(card.title) + cardIndex + '" value="' + choice.value + '">' +
          '<span class="text">' + escapeHtml(choice.text) + '</span>' +
          '</label>' +
          '</div>');
      });
      options += '</div>';

      if (card.others) {
        options += formAuthUtil.getOthersHtml();
        options += formAuthUtil.getValidateHtml();
      }

      if (card.required) {
        options += formAuthUtil.getRequiredHtml('Please choose an answer.');
      }

      return formAuthUtil.getCardHtml(card, cardIndex, options);
    },
    getValue: function (card, cardIndex) {
      var cardDom = formAuthUtil.getCardContainer(cardIndex),
        checkbox = cardDom.find('input[type="checkbox"]'),
        othersVal = card.choices.length;

      var answer = {
        type: card.type,
        choiceAnswer: []
      };

      checkbox.each(function () {
        if ($(this).prop("checked")) {
          var val = parseInt($(this).val());
          if (val === othersVal) {
            answer.others = formAuthUtil.getOthersValue(cardIndex);
          } else {
            answer.choiceAnswer.push(val);
          }
        }
      });

      return answer;
    },
    bindEvent: function (card, cardContainer) {
      var self = this,
        checkboxes = cardContainer.find('input[type="checkbox"]');

      cardContainer.on('ev_valid', function () {
        self.validate(card, cardContainer.attr('card-index'));
      });

      checkboxes.click(function () {
        cardContainer.trigger('ev_valid');
      });

      if (card.others) {
        var othersVal = card.choices.length,
          checkbox = checkboxes.filter('[value="' + othersVal + '"]'),
          othersInput = cardContainer.find('.others-outer');

        checkbox.click(function () {
          if ($(this).prop("checked")) {
            othersInput.removeClass('hidden');
          } else {
            othersInput.addClass('hidden');
          }
        });
      }
    },
    validate: function (card, cardIndex) {
      var valid = !card.required,
        cardDom = formAuthUtil.getCardContainer(cardIndex);

      var checkbox = cardDom.find('input[type="checkbox"]'),
        selected = [];
      var regex = /^[^+@=\-]/;

      if (card.required) {
        checkbox.each(function () {
          if ($(this).prop("checked")) {
            selected.push(parseInt($(this).val()));
          }
        });

        if (selected.length > 0) {
          var othersValue = card.choices.length,
            hasOthers = selected.indexOf(othersValue) !== -1;

          if(hasOthers && formAuthUtil.getOthersValue(cardIndex) && !regex.test(formAuthUtil.getOthersValue(cardIndex))) {
            formAuthUtil.toggleValideStatus(cardIndex, false, true);
            return false
          }

          if (card.required) {
            if(hasOthers && !formAuthUtil.getOthersValue(cardIndex)) {
              formAuthUtil.toggleValideStatus(cardIndex, false);
              return false
            }
          }
        } else {
          formAuthUtil.toggleValideStatus(cardIndex, valid);
          return valid
        }
      }

      formAuthUtil.toggleValideStatus(cardIndex, true);
      return true;
    }
  };
  CARD_MAP[COMBOBOX] = {
    render: function (card, cardIndex) {
      var choices = formAuthUtil.transferChoices(card);
      var options = '<select class="combobox">';
      $.each(choices, function (index, choice) {
        options += '<option value="' + choice.value + '">' + escapeHtml(choice.text) + '</option>';
      });
      options += '</select>'

      if (card.others) {
        options += formAuthUtil.getOthersHtml();
      }

      if (card.required) {
        options += formAuthUtil.getRequiredHtml('Please choose an answer.');
      }

      return formAuthUtil.getCardHtml(card, cardIndex, options);
    },
    getValue: function (card, cardIndex) {
      var cardDom = formAuthUtil.getCardContainer(cardIndex),
        selectVal = parseInt(cardDom.find('select').val());

      var answer = {
        type: card.type
      };

      if (selectVal === card.choices.length) {
        answer.others = formAuthUtil.getOthersValue(cardIndex);
      } else {
        answer.choiceAnswer = [selectVal];
      }
      return answer;
    },
    bindEvent: function (card, cardContainer) {
      if (card.others) {
        var othersVal = card.choices.length,
          combobox = cardContainer.find('select.combobox'),
          othersInput = cardContainer.find('.others-outer');

        combobox.on("change", function () {
          if (parseInt($(this).val()) === othersVal) {
            othersInput.removeClass('hidden');
          } else {
            othersInput.addClass('hidden');
          }
        });
      }
    },
    validate: function (card, cardIndex) {
      var valid = !card.required,
        cardDom = formAuthUtil.getCardContainer(cardIndex);

      if (card.required) {
        var selectValue = cardDom.find('select').val();
        if (selectValue) {
          var isOthersCombo = parseInt(selectValue) === card.choices.length;
          if (!isOthersCombo || formAuthUtil.getOthersValue(cardIndex)) {
            valid = true;
          }
        }
      }

      formAuthUtil.toggleValideStatus(cardIndex, valid);

      return valid;
    }
  };
  CARD_MAP[INPUT] = {
    render: function (card, cardIndex) {
      var html = '<input class="input" maxlength="'+MAX_INPUT_LEN+'"  type="text" />';

      html += formAuthUtil.getValidateHtml();
      if (card.required) {
        html += formAuthUtil.getRequiredHtml('Please Input');
      }

      return formAuthUtil.getCardHtml(card, cardIndex, html);
    },
    getValue: function (card, cardIndex) {
      var cardDom = formAuthUtil.getCardContainer(cardIndex),
        input = cardDom.find('input');

      return {
        type: card.type,
        inputAnswer: input.val()
      };
    },
    bindEvent: function (card, cardContainer) {
      var self = this,
        input = cardContainer.find('input');

      cardContainer.on('ev_valid', function () {
        self.validate(card, cardContainer.attr('card-index'));
      });

      input.on('focusout', function () {
        cardContainer.trigger('ev_valid');
      });
    },
    validate: function (card, cardIndex) {
      var valid = !card.required,
        cardDom = formAuthUtil.getCardContainer(cardIndex);
      var input = cardDom.find('.input');
      var regex = /^[^+@=\-]/
      var isExportToExcelStr = regex.test(input.val())

      if (card.required) {
        if(!input.val()) {
          formAuthUtil.toggleValideStatus(cardIndex, false);
          return false
        }
      }

      if(!isExportToExcelStr) {
        formAuthUtil.toggleValideStatus(cardIndex, false, true);
        return false
      }

      formAuthUtil.toggleValideStatus(cardIndex, true);
      return true;
    }
  };
  CARD_MAP[SCORE] = {
    render: function (card, cardIndex) {
      var html = '<div class="score-outer">';
      html += '<div class="score-wrapper">';
      for (var i = 1; i <= 5; i++) {
        html += '<div class="score-icon" score="' + i + '"></div>';
      }
      html += '</div>';
      html += '<div class="score-tip hidden"></div>';
      html += '<div class="score-comment">';
      html += '<div class="comment-icon-outer">';
      html += '<span class="icon"></span>';
      html += '<span class="text">Comments</span>';
      html += '</div>';
      html += '<textarea class="comment-area" maxlength="'+MAX_INPUT_LEN+'"></textarea>';
      html += '</div>';
      html += '</div>';

      if (card.required) {
        html += formAuthUtil.getRequiredHtml('Please give a rating.');
      }

      return formAuthUtil.getCardHtml(card, cardIndex, html);
    },
    getValue: function (card, cardIndex) {
      var cardDom = formAuthUtil.getCardContainer(cardIndex),
        score = cardDom.find('.score-icon.active'),
        answer = {
          type: card.type
        };

      if (score.length > 0) {
        answer.score = parseInt(score.last().attr('score'));
      }

      var commentDom = cardDom.find('.score-comment.active');
      if (commentDom.length > 0) {
        answer.inputAnswer = commentDom.find('textarea').val();
      }

      return answer;
    },
    bindEvent: function (card, cardContainer) {
      var scoreIcon = cardContainer.find('.score-icon'),
        scoreTip = cardContainer.find('.score-tip'),
        writeIcon = cardContainer.find('.comment-icon-outer'),
        self = this;

      cardContainer.on('ev_valid', function () {
        self.validate(card, cardContainer.attr('card-index'));
      });

      scoreIcon.click(function () {
        scoreIcon.removeClass('active');

        $(this).addClass('active')
          .prevAll().addClass('active');

        var index = $(this).attr('score') - 1;
        if (card.scoreNotes[index]) {
          scoreTip.text(card.scoreNotes[index]).removeClass('hidden');
        } else {
          scoreTip.text('').addClass('hidden');
        }

        cardContainer.trigger('ev_valid');
      });

      writeIcon.click(function () {
        writeIcon.parent().toggleClass('active');
      });
    },
    validate: function (card, cardIndex) {
      var valid = !card.required,
        cardDom = formAuthUtil.getCardContainer(cardIndex);

      if (card.required) {
        var scores = cardDom.find('.score-icon.active');
        if (scores.length > 0) {
          valid = true;
        }
      }

      formAuthUtil.toggleValideStatus(cardIndex, valid);

      return valid;
    }
  };
  CARD_MAP[NOTE] = {
    render: formAuthUtil.getCardHtml,
    getValue: function (card, cardIndex) {
      return {
        type: card.type
      };
    }
  };

  function init (config) {
    $("#access-title").html('');
    $("#button-login").html(globalConfig.formAuthButtonText);
    window.authType = FORM_AUTH_ACCESS_TYPE;
  }

  function showFormAuth (config) {
    renderFormTitle(config);
    var html = getCardsHtml(config);
    $('#form-auth-content').html(html);
    bindCardsEvent(config);
    $('#form-auth-msg').show();
  }

  function bindCardsEvent(globalConfig) {
    $('#form-auth-content .card-container').each(function () {
      var index = parseInt($(this).attr('card-index'));
      var card = globalConfig.formAuth.cardList[index];
      !!CARD_MAP[card.type].bindEvent && !!CARD_MAP[card.type].bindEvent(card, $(this));
    });
  }

  function renderFormTitle (globalConfig) {
    $('#form-auth-title').text(globalConfig.formAuth.title);
    $('#form-auth-note').text(globalConfig.formAuth.note);
  }

  function isFormAuthValid() {
    var cards = globalConfig.formAuth.cardList,
      valid = true;
    $.each(cards, function (index, card) {
      var validate = CARD_MAP[card.type].validate;
      if (validate && !validate(card, index)) {
        valid = false;
      }
    });

    return valid;
  }

  function getAuthData() {
    var answers = [];
    var cards = globalConfig.formAuth.cardList;

    $.each(cards, function (index, card) {
      if (CARD_MAP[card.type].getValue) {
        answers.push(CARD_MAP[card.type].getValue(card, index));
      }
    });

    return {
      formAuthId: globalConfig.formAuth.id,
      answers: answers
    };
  }

  function submitFormAuth(handleSubmit) {
    if ($("#form-auth-submit").hasClass("disabled")) return;
    if (isFormAuthValid()) {
      handleSubmit();
    }
  }

  function getCardsHtml(globalConfig) {
    var cards = globalConfig.formAuth.cardList,
      html = '';
    $.each(cards, function (i, card) {
      html += CARD_MAP[card.type].render(card, i);
    });
    return html;
  }

  return {
    init: init,
    isFormAuthValid: isFormAuthValid,
    getAuthData: getAuthData,
    showFormAuth: showFormAuth,
    submitFormAuth: submitFormAuth
  }
}

function escapeHtml(string) {
  if (string === null || string === undefined) {
    return "";
  }
  var r = string.toString();
  r = r.replace(/\&/g, "&amp;");
  r = r.replace(/\</g, "&lt;");
  r = r.replace(/\>/g, "&gt;");
  r = r.replace(/\"/g, "&quot;");
  r = r.replace(/\'/g, "&#39;");
  r = r.replace(/\s/g, "&nbsp;");
  return r;
};

function setNormalButton() {
    $("#button-login").html(globalConfig.buttonText);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapExperienceLayers);
} else {
  bootstrapExperienceLayers();
}

function bootstrapExperienceLayers() {
  hydrateAssetsFromSupabase()
    .catch(function (err) {
      console.warn("Supabase asset hydration issue", err);
    })
    .finally(function () {
      enhanceExperienceLayers();
      // Attempt to auto-play lounge music after experience layers are ready
      setTimeout(function() {
        var audioEl = document.getElementById("portal-audio");
        if (audioEl && audioEl.paused) {
          var playPromise = audioEl.play();
          if (playPromise && playPromise.catch) {
            playPromise.catch(function(err) {
              // Autoplay might be blocked by browser, ignore silently
            });
          }
        }
      }, 500);
    });
}

function enhanceExperienceLayers() {
  if (experienceLayersBootstrapped) {
    return;
  }
  experienceLayersBootstrapped = true;
  initBackgroundCarousel();
  initAudioController();
  initAdRail();
}

function initBackgroundCarousel() {
  var slideNodes = Array.prototype.slice.call(document.querySelectorAll(".gallery-slide"));
  if (!slideNodes.length || !BACKGROUND_SLIDES.length) {
    return;
  }

  var sceneIndex = 0;
  var slotIndex = 0;

  function renderNextScene() {
    var slideEl = slideNodes[slotIndex % slideNodes.length];
    var scene = BACKGROUND_SLIDES[sceneIndex % BACKGROUND_SLIDES.length];
    var backgroundValue = formatBackgroundSource(scene.source);

    slideEl.style.backgroundImage = backgroundValue;
    slideEl.dataset.sceneIndex = sceneIndex;

    slideNodes.forEach(function (node) { node.classList.remove("active"); });
    slideEl.classList.add("active");

    updateSceneIndicator(sceneIndex, scene.caption || "Connected venue");

    slotIndex = (slotIndex + 1) % slideNodes.length;
    sceneIndex = (sceneIndex + 1) % BACKGROUND_SLIDES.length;
  }

  function updateSceneIndicator(index, caption) {
    var labelEl = document.getElementById("slide-label");
    var captionEl = document.getElementById("slide-caption");
    var totalScenes = BACKGROUND_SLIDES.length;
    if (labelEl) {
      var sceneNumber = (index % totalScenes) + 1;
      labelEl.textContent = sceneNumber < 10 ? "Scene 0" + sceneNumber : "Scene " + sceneNumber;
    }
    if (captionEl) {
      captionEl.textContent = caption;
    }
  }

  renderNextScene();
  setInterval(renderNextScene, 11000);
}

function initAudioController() {
  var audioEl = document.getElementById("portal-audio");
  var toggleBtn = document.getElementById("audio-toggle");
  var stateLabel = document.getElementById("audio-state");
  var trackTitle = document.getElementById("track-title");
  var nextBtn = document.getElementById("audio-next");
  var prevBtn = document.getElementById("audio-prev");
  var progressBar = document.getElementById("audio-progress");
  var currentTimeLabel = document.getElementById("audio-current-time");
  var durationLabel = document.getElementById("audio-duration");

  // Support for multiple audio tracks
  var audioTracks = window.BACKGROUND_AUDIO_TRACKS || [];
  var currentTrack = 0;
  if (!Array.isArray(audioTracks) || audioTracks.length === 0) {
    // fallback to single audio
    audioTracks = [{
      src: audioEl.querySelector('source') ? audioEl.querySelector('source').src : audioEl.src,
      title: audioEl.getAttribute('data-track-title') || 'Skyart Lounge Loop'
    }];
  }

  function playTrack(idx) {
    if (idx < 0 || idx >= audioTracks.length) return;
    currentTrack = idx;
    audioEl.src = audioTracks[idx].src;
    audioEl.setAttribute('data-track-title', audioTracks[idx].title);
    if (trackTitle) trackTitle.textContent = audioTracks[idx].title;
    audioEl.load();
    audioEl.play().catch(function(){});
    setTimeout(updateTimeBar, 100); // update time bar after loading new track
  }

  // --- Time bar helpers ---
  function formatTime(sec) {
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function updateTimeBar() {
    if (!progressBar || !audioEl.duration) return;
    progressBar.max = Math.floor(audioEl.duration);
    progressBar.value = Math.floor(audioEl.currentTime);
    if (currentTimeLabel) currentTimeLabel.textContent = formatTime(audioEl.currentTime);
    if (durationLabel) durationLabel.textContent = formatTime(audioEl.duration);
  }
  if (progressBar) {
    progressBar.addEventListener('input', function() {
      audioEl.currentTime = progressBar.value;
      updateTimeBar();
    });
  }
  if (audioEl) {
    audioEl.addEventListener('timeupdate', updateTimeBar);
    audioEl.addEventListener('loadedmetadata', updateTimeBar);
  }

  // --- Play/Pause ---
  toggleBtn.addEventListener("click", function () {
    if (audioEl.paused) {
      var attempt = audioEl.play();
      if (attempt && attempt.then) {
        attempt.then(function () {
          stateLabel.textContent = "Pause";
        }).catch(function () {
          stateLabel.textContent = "Play";
        });
      } else {
        stateLabel.textContent = "Pause";
      }
    } else {
      audioEl.pause();
      stateLabel.textContent = "Play";
    }
  });

  // --- Previous Track ---
  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      playTrack((currentTrack - 1 + audioTracks.length) % audioTracks.length);
    });
  }

  // --- Next Track ---
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      playTrack((currentTrack + 1) % audioTracks.length);
    });
  }

  audioEl.addEventListener("play", function () { stateLabel.textContent = "Pause"; });
  audioEl.addEventListener("pause", function () { stateLabel.textContent = "Play"; });
}

function initAdRail() {
  var track = document.getElementById("ads-track");
  var indicator = document.getElementById("ad-indicator");

  if (!track || !PORTAL_ADS.length) {
    return;
  }

  track.innerHTML = "";
  PORTAL_ADS.forEach(function (ad) {
    track.appendChild(buildAdCard(ad));
  });

  var index = 0;

  function renderPosition() {
    track.style.transform = "translateX(-" + (index * 100) + "%)";
    if (indicator) {
      indicator.textContent = padWithZero(index + 1) + " / " + padWithZero(PORTAL_ADS.length);
    }
  }

  renderPosition();
  var autoRotate = setInterval(function () {
    index = (index + 1) % PORTAL_ADS.length;
    renderPosition();
  }, 3000);

  var prevBtn = document.getElementById("ad-prev");
  var nextBtn = document.getElementById("ad-next");
  function goToPrev() {
    index = (index - 1 + PORTAL_ADS.length) % PORTAL_ADS.length;
    renderPosition();
    resetAutoRotate();
  }
  function goToNext() {
    index = (index + 1) % PORTAL_ADS.length;
    renderPosition();
    resetAutoRotate();
  }
  function resetAutoRotate() {
    clearInterval(autoRotate);
    autoRotate = setInterval(function () {
      index = (index + 1) % PORTAL_ADS.length;
      renderPosition();
    }, 3000);
  }
  if (prevBtn) prevBtn.addEventListener("click", goToPrev);
  if (nextBtn) nextBtn.addEventListener("click", goToNext);
}

function buildAdCard(ad) {
  var card = document.createElement("article");
  card.className = "ad-card";
  card.style.backgroundImage = formatBackgroundSource(ad.background || ad.image);

  var content = document.createElement("div");
  content.className = "ad-content";

  var eyebrow = document.createElement("p");
  eyebrow.className = "ad-eyebrow";
  eyebrow.textContent = ad.eyebrow || "Featured";

  var title = document.createElement("h3");
  title.className = "ad-title";
  title.textContent = ad.title || "";

  var body = document.createElement("p");
  body.className = "ad-body";
  body.textContent = ad.body || "";

  content.appendChild(eyebrow);
  content.appendChild(title);
  content.appendChild(body);

  var ctaWrapper = document.createElement("div");
  ctaWrapper.className = "ad-cta";
  if (ad.cta) {
    if (ad.link) {
      var linkEl = document.createElement("a");
      linkEl.href = ad.link;
      linkEl.target = "_blank";
      linkEl.rel = "noopener noreferrer";
      linkEl.textContent = ad.cta;
      ctaWrapper.appendChild(linkEl);
    } else {
      ctaWrapper.textContent = ad.cta;
    }
  }

  card.appendChild(content);
  card.appendChild(ctaWrapper);
  return card;
}

function formatBackgroundSource(source) {
  if (!source) {
    return "linear-gradient(135deg,#0f0c29,#302b63,#24243e)";
  }
  var trimmed = source.trim();
  if (trimmed.indexOf("gradient") > -1 || trimmed.indexOf("url(") === 0) {
    return trimmed;
  }
  return "url('" + trimmed + "')";
}

function padWithZero(value) {
  return value < 10 ? "0" + value : String(value);
}

function hydrateAssetsFromSupabase() {
  var client = initSupabaseClient();
  if (!client) {
    return Promise.resolve();
  }
  var tasks = [
    fetchSupabaseBackgrounds(client),
    fetchSupabaseAudio(client)
  ];
  return Promise.allSettled(tasks).then(function (results) {
    results.forEach(function (result) {
      if (result.status === "rejected") {
        console.warn("Failed to load Supabase asset", result.reason);
      }
    });
  });
}

function initSupabaseClient() {
  if (supabaseClient !== null) {
    return supabaseClient;
  }
  if (!supabaseConfig || !supabaseConfig.url || !supabaseConfig.anonKey) {
    supabaseClient = null;
    return null;
  }
  if (typeof window === "undefined") {
    return null;
  }
  var supabaseLib = window.supabase || window.Supabase;
  if (!supabaseLib || typeof supabaseLib.createClient !== "function") {
    return null;
  }
  supabaseClient = supabaseLib.createClient(supabaseConfig.url, supabaseConfig.anonKey);
  return supabaseClient;
}

function fetchSupabaseBackgrounds(client) {
    console.log('[Supabase Debug] fetchSupabaseBackgrounds config:', supabaseConfig);
  if (!supabaseConfig.imageBucket) {
    return Promise.resolve();
  }
  var prefix = normalizeStoragePath(supabaseConfig.imagePrefix || "");
  var listPath = prefix || undefined;
  // Helper to recursively list all images in a folder
  function listAllImages(folder) {
    console.log('[Supabase Debug] Listing images in folder:', folder);
    var listArg = (folder === "" || folder === undefined) ? undefined : folder;
    console.log('[Supabase Debug] Using list arg:', listArg === undefined ? '<root>' : listArg);
    return client.storage
      .from(supabaseConfig.imageBucket)
      .list(listArg, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" }
      })
      .then(function (result) {
        if (result.error) {
          console.error('[Supabase Debug] Error listing images:', result.error);
          throw result.error;
        }
        console.log('[Supabase Debug] list result length:', (result.data && result.data.length) || 0);
        if (!result.data || !result.data.length) {
          console.warn('[Supabase Debug] No images found in folder:', listArg === undefined ? '<root>' : listArg);
          return [];
        }
        var files = [];
        var subfolders = [];
        result.data.forEach(function(entry) {
          console.log('[Supabase Debug] entry:', entry.name, entry.metadata && entry.metadata.mimetype);
          if (entry.metadata && entry.metadata.mimetype === "inode/directory") {
            subfolders.push(buildStoragePath(listArg || "", entry.name));
          } else if (entry.name) {
            var fileObj = {
              objectPath: buildStoragePath(listArg || "", entry.name),
              name: entry.name
            };
            files.push(fileObj);
            console.log('[Supabase Debug] Found image:', fileObj.objectPath);
          }
        });
        // Recursively list subfolders
        return Promise.all(subfolders.map(listAllImages)).then(function(nested) {
          return files.concat(...nested);
        });
      });
  }
  return listAllImages(listPath || "").then(function(allFiles) {
    var slides = allFiles.map(function(file) {
      var publicUrl = client.storage.from(supabaseConfig.imageBucket).getPublicUrl(file.objectPath);
      var resolvedUrl = publicUrl && publicUrl.data && publicUrl.data.publicUrl;
      return {
        source: resolvedUrl || file.objectPath,
        caption: formatAssetCaption(file.name)
      };
    }).filter(function(slide) { return !!slide.source; });

    // Include any direct image URLs configured
    if (supabaseConfig.imageUrls && Array.isArray(supabaseConfig.imageUrls)) {
      supabaseConfig.imageUrls.forEach(function(url) {
        if (url) {
          slides.push({ source: url, caption: formatAssetCaption(url) });
          console.log('[Supabase Debug] Added direct image URL to slides:', url);
        }
      });
    }
    // Also support a single imageObjectPath if it's a full URL
    if (supabaseConfig.imageObjectPath && /^https?:\/\//i.test(supabaseConfig.imageObjectPath)) {
      slides.push({ source: supabaseConfig.imageObjectPath, caption: formatAssetCaption(supabaseConfig.imageObjectPath) });
      console.log('[Supabase Debug] Added imageObjectPath (direct URL) to slides:', supabaseConfig.imageObjectPath);
    }

    // Deduplicate by source
    var seen = {};
    slides = slides.filter(function(s) {
      if (!s || !s.source) return false;
      if (seen[s.source]) return false;
      seen[s.source] = true;
      return true;
    });

    if (slides.length) {
      BACKGROUND_SLIDES = slides;
      // Update campaigns to mirror background slides
      try {
        PORTAL_ADS = BACKGROUND_SLIDES.map(function(slide, idx) {
          return {
            eyebrow: "Scene " + (idx + 1),
            title: slide.caption || "Portal Scene",
            body: "Enjoy our rotating venue scenes.",
            cta: "",
            link: "#",
            background: slide.source
          };
        });
        console.log('[Supabase Debug] PORTAL_ADS updated from BACKGROUND_SLIDES, count:', PORTAL_ADS.length);
      } catch (e) {
        console.warn('[Supabase Debug] failed to update PORTAL_ADS', e);
      }
    }
  });
}

function fetchSupabaseAudio(client) {
  console.log('[Supabase Debug] fetchSupabaseAudio config:', supabaseConfig);
  var audioEl = document.getElementById("portal-audio");
  if (!audioEl) {
    return Promise.resolve();
  }

  var audioPath = supabaseConfig.audioObjectPath;
  var playlist = [];

  // Helper to add a track
  function addTrack(src, title) {
    if (!src) return;
    playlist.push({ src: src, title: title || formatAssetCaption(src) });
    console.log('[Supabase Debug] queued audio track:', src);
  }

  // If a full URL is provided in audioObjectPath, add it first
  if (audioPath && /^https?:\/\//i.test(audioPath)) {
    addTrack(audioPath, supabaseConfig.audioTitle || formatAssetCaption(audioPath));
  }

  // If audioBucket is set, try to list all audio files in the prefix
  if (supabaseConfig.audioBucket) {
    var prefix = normalizeStoragePath(supabaseConfig.audioPrefix || "");
    var listArg = prefix || undefined;
    console.log('[Supabase Debug] listing audio bucket:', supabaseConfig.audioBucket, 'prefix:', listArg === undefined ? '<root>' : listArg);
    return client.storage.from(supabaseConfig.audioBucket).list(listArg, { limit: 1000 }).then(function (result) {
      if (result.error) {
        console.error('[Supabase Debug] audio list error:', result.error);
        // if we already have at least one direct track, use it
        if (playlist.length) {
          window.BACKGROUND_AUDIO_TRACKS = playlist;
          return playlist;
        }
        return [];
      }
      var entries = result.data || [];
      entries.forEach(function (entry) {
        if (entry && entry.name && !(entry.metadata && entry.metadata.mimetype === 'inode/directory')) {
          var objectPath = buildStoragePath(listArg || "", entry.name);
          var publicResponse = client.storage.from(supabaseConfig.audioBucket).getPublicUrl(objectPath);
          var publicUrl = publicResponse && publicResponse.data && publicResponse.data.publicUrl;
          if (publicUrl) {
            addTrack(publicUrl, formatAssetCaption(entry.name));
          } else {
            console.warn('[Supabase Debug] audio item has no public URL:', objectPath);
          }
        }
      });
      // Deduplicate tracks by src
      var seen = {};
      playlist = playlist.filter(function (t) {
        if (seen[t.src]) return false;
        seen[t.src] = true;
        return true;
      });
      if (playlist.length) {
        window.BACKGROUND_AUDIO_TRACKS = playlist;
        // set first track to audio element if none set
        audioEl.src = playlist[0].src;
        audioEl.setAttribute('data-track-title', playlist[0].title);
        if (document.readyState !== 'loading') audioEl.load();
      }
      return playlist;
    }).catch(function (err) {
      console.error('[Supabase Debug] failed to list audio bucket', err);
      if (playlist.length) {
        window.BACKGROUND_AUDIO_TRACKS = playlist;
        return playlist;
      }
      return [];
    });
  }

  // If no audioBucket and we added a direct URL, set it
  if (playlist.length) {
    window.BACKGROUND_AUDIO_TRACKS = playlist;
    audioEl.src = playlist[0].src;
    audioEl.setAttribute('data-track-title', playlist[0].title);
    audioEl.load();
    return Promise.resolve(playlist);
  }
  return Promise.resolve([]);
}

// Debug helper: show listing and thumbnails for the image bucket
function debugSupabaseListing() {
  try {
    var client = initSupabaseClient();
    if (!client) {
      console.warn('[Supabase Debug] Supabase client not initialized');
      return;
    }
    var bucket = supabaseConfig.imageBucket;
    if (!bucket) {
      console.warn('[Supabase Debug] imageBucket not set in config');
      return;
    }
    var prefix = normalizeStoragePath(supabaseConfig.imagePrefix || '');
    var listArg = prefix || undefined;
    console.log('[Supabase Debug] (manual) listing', bucket, 'prefix:', listArg === undefined ? '<root>' : listArg);
    client.storage.from(bucket).list(listArg, { limit: 1000 }).then(function(res) {
      if (res.error) {
        console.error('[Supabase Debug] storage.list error', res.error);
        return;
      }
      var entries = res.data || [];
      console.log('[Supabase Debug] manual list length:', entries.length, entries);
      // Build or reuse modal
      var modal = document.getElementById('supabase-debug-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'supabase-debug-modal';
        modal.style.position = 'fixed';
        modal.style.right = '16px';
        modal.style.bottom = '16px';
        modal.style.width = '360px';
        modal.style.maxHeight = '70vh';
        modal.style.overflow = 'auto';
        modal.style.background = 'rgba(0,0,0,0.8)';
        modal.style.color = '#fff';
        modal.style.borderRadius = '8px';
        modal.style.padding = '12px';
        modal.style.zIndex = 9999;
        var close = document.createElement('button');
        close.textContent = 'Close';
        close.style.float = 'right';
        close.addEventListener('click', function() { modal.remove(); });
        modal.appendChild(close);
        // Controls: allow setting image/audio prefixes and refreshing listings
        var controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '8px';
        controls.style.marginBottom = '8px';

        var imgLabel = document.createElement('label');
        imgLabel.textContent = 'Image prefix:';
        imgLabel.style.fontSize = '12px';
        imgLabel.style.alignSelf = 'center';
        var imgInput = document.createElement('input');
        imgInput.type = 'text';
        imgInput.value = supabaseConfig.imagePrefix || '';
        imgInput.style.flex = '1';

        var audLabel = document.createElement('label');
        audLabel.textContent = 'Audio prefix:';
        audLabel.style.fontSize = '12px';
        audLabel.style.alignSelf = 'center';
        var audInput = document.createElement('input');
        audInput.type = 'text';
        audInput.value = supabaseConfig.audioPrefix || '';
        audInput.style.flex = '1';

        var refreshBtn = document.createElement('button');
        refreshBtn.textContent = 'Refresh Assets';
        refreshBtn.style.flex = '0 0 auto';
        refreshBtn.addEventListener('click', function () {
          // Update config and re-run hydration
          supabaseConfig.imagePrefix = imgInput.value || '';
          supabaseConfig.audioPrefix = audInput.value || '';
          console.log('[Supabase Debug] Updated prefixes, rehydrating assets', supabaseConfig.imagePrefix, supabaseConfig.audioPrefix);
          hydrateAssetsFromSupabase().then(function() {
            // After hydrate, refresh modal listing
            debugSupabaseListing();
          }).catch(function(err){
            console.error('[Supabase Debug] hydrate failed', err);
          });
        });

        // Append controls into modal
        controls.appendChild(imgLabel);
        controls.appendChild(imgInput);
        controls.appendChild(audLabel);
        controls.appendChild(audInput);
        controls.appendChild(refreshBtn);
        modal.appendChild(controls);

        var title = document.createElement('div');
        title.textContent = 'Supabase Storage Debug — ' + bucket + (listArg ? '/' + listArg : ' (root)');
        title.style.fontWeight = '600';
        title.style.marginBottom = '8px';
        modal.appendChild(title);
        var listContainer = document.createElement('div');
        listContainer.id = 'supabase-debug-list';
        modal.appendChild(listContainer);
        document.body.appendChild(modal);
      }
      var listContainer = document.getElementById('supabase-debug-list');
      listContainer.innerHTML = '';
      if (!entries.length) {
        listContainer.textContent = 'No files returned from storage.list()';
        return;
      }
      entries.forEach(function(entry) {
        var row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.marginBottom = '8px';
        var name = document.createElement('div');
        name.textContent = entry.name;
        name.style.flex = '1';
        row.appendChild(name);
        if (!(entry.metadata && entry.metadata.mimetype === 'inode/directory')) {
          var objectPath = buildStoragePath(listArg || '', entry.name);
          var publicResponse = client.storage.from(bucket).getPublicUrl(objectPath);
          var publicUrl = publicResponse && publicResponse.data && publicResponse.data.publicUrl;
          if (publicUrl) {
            var thumb = document.createElement('img');
            thumb.src = publicUrl;
            thumb.style.width = '72px';
            thumb.style.height = '48px';
            thumb.style.objectFit = 'cover';
            thumb.style.marginLeft = '8px';
            row.appendChild(thumb);
          } else {
            var note = document.createElement('span');
            note.textContent = ' (no public URL)';
            note.style.marginLeft = '8px';
            row.appendChild(note);
            console.warn('[Supabase Debug] no public url for', objectPath, publicResponse);
          }
        } else {
          var folderTag = document.createElement('span');
          folderTag.textContent = ' (folder)';
          folderTag.style.marginLeft = '8px';
          row.appendChild(folderTag);
        }
        listContainer.appendChild(row);
      });
    }).catch(function(err){
      console.error('[Supabase Debug] list failed', err);
    });
  } catch (e) {
    console.error('[Supabase Debug] unexpected', e);
  }
}


// Always hydrate assets from Supabase on page load (no debug button needed)
function autoHydrateSupabaseAssets() {
  hydrateAssetsFromSupabase().then(function() {
    console.log('[Supabase] Assets hydrated on page load.');
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoHydrateSupabaseAssets);
} else {
  autoHydrateSupabaseAssets();
}

function normalizeStoragePath(path) {
  if (!path) {
    return "";
  }
  return path.toString().replace(/^\/+/, "").replace(/\/+$/, "").replace(/\\/g, "/");
}

function buildStoragePath(prefix, name) {
  var normalizedPrefix = normalizeStoragePath(prefix);
  var normalizedName = normalizeStoragePath(name);
  if (normalizedPrefix && normalizedName) {
    return normalizedPrefix + "/" + normalizedName;
  }
  return normalizedPrefix || normalizedName;
}

function formatAssetCaption(filename) {
  if (!filename) {
    return "Supabase Scene";
  }
  var sanitized = filename.toString().split("/").pop();
  var base = sanitized.replace(/\.[^.]+$/, "");
  base = base.replace(/[-_]+/g, " ");
  base = base.trim();
  if (!base) {
    return "Supabase Scene";
  }
  return base.replace(/\b\w/g, function (char) { return char.toUpperCase(); });
}

/* === PATCH: Safe viewport fallback for older mobile browsers === */
(function () {
  function setVH() {
    const vh = window.innerHeight * 0.01; // 1% of viewport height
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  setVH();
  window.addEventListener('resize', setVH);
})();
