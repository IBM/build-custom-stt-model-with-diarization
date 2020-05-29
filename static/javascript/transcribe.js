const uploading2 = document.getElementById("uploading2");
const error2 = document.getElementById("error2");
const uploaded2 = document.getElementById("uploaded2");

const audio = document.getElementById("audio");
const audioText = document.getElementById("audioText");

const scrollClass = document.getElementById("scrollClass");
const loading = document.getElementById("Loading");

const gotLangModel = document.getElementById("gotLangModel");
const getLangModel = document.getElementById("getLangModel");

const gotAcoModel = document.getElementById("gotAcoModel");
const getAcoModel = document.getElementById("getAcoModel");

const modalContent = document.getElementById("modalContent");
const toast = document.getElementById("toast");

let arr = [];
let uniqueSpeakers = [];

$(document).ready(function() {

    uploaded2.style.display = "none";
    error2.style.display = "none";
    uploading2.style.display = "none";

    audio.style.display = "none";
    audioText.style.display = "none";
    loading.style.display = "none";

    gotAcoModel.style.display = "none";
    gotLangModel.style.display = "none";

    toast.style.display = "none";

    getLanguageModels();
    getAcousticModels();

});

$('#Transcribe').on('click', function() {
    loading.style.display = "block";
    uploading2.style.display = "block";
    if (isEmpty($('#myFiles'))) {
        uploading2.style.display = "none";
        error2.style.display = "block";
        loading.style.display = "none";
    } else {
        let model = { langModel: document.getElementById("select-id1").value, acoModel: document.getElementById("select-id2").value };
        let formData = new FormData($('form')[0]);
        formData.append("model", JSON.stringify(model));

        error2.style.display = "none";
        $.ajax({
            url: '/transcribeAudio',
            type: 'POST',
            data: formData,
            cache: false,
            contentType: false,
            processData: false,
            success: function(response) {
                arr = [];
                myData = JSON.parse(response);
                uploading2.style.display = "none";
                loading.style.display = "none";

                audioPlayer = '<br/><a><audio controls> <source src="static/audios/' +
                    myData[0].filename + '" type="audio/flac"> Your browser does not support the audio element. </audio></a>';

                audio.style.display = "block";
                audioText.style.display = "block";

                audio.innerHTML = audioPlayer;

                scrollClass.innerHTML = '<div class="bx--tile">\
                                        <button class="bx--btn bx--btn--primary bx--btn--field" type="button" onclick="saveTextToCOS()">\
                                        Save Text to Cloud Object Storage\
                                        <svg focusable="false" preserveAspectRatio="xMidYMid meet" style="will-change: transform;" xmlns="http://www.w3.org/2000/svg" class="bx--btn__icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">\
                                        <path d = "M9 7L9 3 7 3 7 7 3 7 3 9 7 9 7 13 9 13 9 9 13 9 13 7z" ></path></svg>\
                                        </button>\
                                        <button class="bx--btn bx--btn--primary bx--btn--field" type="button">\
                                        Download Text\
                                        <svg focusable="false" preserveAspectRatio="xMidYMid meet" style="will-change: transform;" xmlns="http://www.w3.org/2000/svg" class="bx--btn__icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">\
                                        <path d="M7.5 11l4.1-4.4.7.7L7 13 1.6 7.3l.7-.7L6.5 11V0h1v11zM13 15v-2h1v2c0 .6-.4 1-1 1H1c-.6 0-1-.4-1-1v-2h1v2h12z"></path></svg>\
                                        </button>\
                                        <button class="bx--btn bx--btn--primary bx--btn--field" type="button">\
                                        Download Text with Speaker Details\
                                        <svg focusable="false" preserveAspectRatio="xMidYMid meet" style="will-change: transform;" xmlns="http://www.w3.org/2000/svg" class="bx--btn__icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">\
                                        <path d="M7.5 11l4.1-4.4.7.7L7 13 1.6 7.3l.7-.7L6.5 11V0h1v11zM13 15v-2h1v2c0 .6-.4 1-1 1H1c-.6 0-1-.4-1-1v-2h1v2h12z"></path></svg>\
                                        </button>\
                                        </div>\
                                        <br>';


                myData.forEach(element => {
                    if (element.speaker == undefined) {

                    } else {
                        addSpeaker = '<div class="bx--tile">\
                                    <h4 class="time-left"> Speaker ' + element.speaker + '</h4>\
                                    <hr>\
                                    <div class="well darker">\
                                        <p>' + element.transcript + '</p>\
                                    </div>\
                                </div>\
                                <br>';

                        scrollClass.innerHTML += addSpeaker;
                        arr.push(element.speaker);
                    }
                });
                uniqueSpeakers = [];
                uniqueSpeakers = arr.unique();
            },
            error: function() {
                error2.style.display = "block";
            }
        });
    }

});

Array.prototype.contains = function(v) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === v) return true;
    }
    return false;
};

Array.prototype.unique = function() {
    var arr = [];
    for (var i = 0; i < this.length; i++) {
        if (!arr.contains(this[i])) {
            arr.push(this[i]);
        }
    }
    return arr;
}

function isEmpty(el) {
    return !$.trim(el.html())
}

async function getLanguageModels() {
    await fetch('/listLanguageModels').then(async(response) => {
        data = await response.json();

        var dynamicSelect = document.getElementById("select-id1");

        data.customizations.forEach(element => {

            var newOption = document.createElement("option");
            newOption.text = element.name.toString(); //item.whateverProperty
            newOption.value = element.customization_id.toString(); //item.whateverProperty

            dynamicSelect.add(newOption);

            //new select items should populated immediately
        });

        getLangModel.style.display = "none";
        gotLangModel.style.display = "block";

    });
}

async function getAcousticModels() {
    await fetch('/listAcousticModels').then(async(response) => {
        data = await response.json();

        var dynamicSelect = document.getElementById("select-id2");

        data.customizations.forEach(element => {

            var newOption = document.createElement("option");
            newOption.text = element.name.toString(); //item.whateverProperty
            newOption.value = element.customization_id.toString(); //item.whateverProperty

            dynamicSelect.add(newOption);

            //new select items should populated immediately
        });

        getAcoModel.style.display = "none";
        gotAcoModel.style.display = "block";

    });
}

async function saveTextToCOS() {
    await fetch('/saveTextToCOS').then(async(response) => {
        data = await response.json();
        cosNotify.innerHTML = '';
        cosNotify.innerHTML = data.msg;
        toast.style.display = "block";
    });
}