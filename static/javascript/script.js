const refresh2 = document.getElementById("refresh2");
const refresh3 = document.getElementById("refresh3");
const refresh4 = document.getElementById("refresh4");

const toast = document.getElementById("toast");
const toast2 = document.getElementById("toast2");

const table = document.getElementById("table");
const tableRef = table.getElementsByTagName('tbody')[0];

const corpusTable = document.getElementById("corpusTable");
const corpusTableRef = corpusTable.getElementsByTagName('tbody')[0];
const corpusDetails = document.getElementById("corpusDetails");

const audiosTable = document.getElementById("audiosTable");
const audiosTableRef = audiosTable.getElementsByTagName('tbody')[0];
const audioDetails = document.getElementById("audioDetails");

const uploading2 = document.getElementById("uploading2");
const error2 = document.getElementById("error2");
const uploaded2 = document.getElementById("uploaded2");

const BtnTrainAcousticModel = document.getElementById("BtnTrainAcousticModel");
const btnTrainLanguageModel = document.getElementById("btnTrainLanguageModel");

const clickBtn2 = document.getElementById("clickBtn2");
const clickBtn3 = document.getElementById("clickBtn3");
const clickBtn4 = document.getElementById("clickBtn4");
const showModal = document.getElementById("showModal");

const cosNotify = document.getElementById("cosNotify");
const sttNotify = document.getElementById("sttNotify");

const refreshMsg = document.getElementById("refreshMsg");

const remove1 = document.getElementById("remove1");
const remove2 = document.getElementById("remove2");

const trainingMsg1 = document.getElementById("trainingMsg1");
const trainingMsg2 = document.getElementById("trainingMsg2");

const training1 = document.getElementById("training1");
const training2 = document.getElementById("training2");

$(document).ready(function() {
    toast.style.display = "none";
    toast2.style.display = "none";
    refresh2.style.display = "none";
    refresh3.style.display = "none";
    refresh4.style.display = "none";

    table.style.display = "none";

    corpusTable.style.display = "none";
    corpusDetails.style.display = "none";

    audiosTable.style.display = "none";
    audioDetails.style.display = "none";

    uploaded2.style.display = "none";
    error2.style.display = "none";
    uploading2.style.display = "none";


    training1.style.display = "none";
    training2.style.display = "none";


    getCOSCredentials();
    getSTTCredentials();

});

async function getCOSCredentials() {
    await fetch('/initCOS').then(async(response) => {
        data = await response.json();

        temp = data.message.split(' ');

        if (temp[temp.length - 1] == "found!") {

        } else {
            cosNotify.innerHTML = " ";
            cosNotify.innerHTML = data.message;
            toast.style.display = "block";
        }

        if (data.message == " 'bucket_name'") {
            showModal.click();
            cosNotify.innerHTML = " ";
            cosNotify.innerHTML = "Object Storage Bucket NOT Specified!, Refresh the page to configure.";
            toast.style.display = "block";
        } else
            clickBtn2.click();

    });
}

async function getSTTCredentials() {
    await fetch('/initSTT').then(async(response) => {
        data = await response.json();
        sttNotify.innerHTML = " ";
        sttNotify.innerHTML = data.message;
        // toast2.style.display = "block";
        clickBtn3.click();
        clickBtn4.click();
    });
}

function isEmpty(el) {
    return !$.trim(el.html())
}

$('#Upload').on('click', function() {
    uploading2.style.display = "block";
    if (isEmpty($('#myFiles'))) {
        uploading2.style.display = "none";
        error2.style.display = "block";
    } else {
        error2.style.display = "none";
        $.ajax({
            url: '/uploader',
            type: 'POST',
            data: new FormData($('form')[0]),
            dataType: 'json',
            cache: false,
            contentType: false,
            processData: false,
            success: function(response) {

                if (response.message != 0) {
                    uploading2.style.display = "none";
                    uploaded2.style.display = "block";
                    // clickBtn1.click();
                    uploadSttL();
                } else {
                    error2.style.display = "block";
                }
            },
            error: function() {
                error2.style.display = "block";
            }
        });
    }

});

async function setupCOS() {
    setTimeout(function() {
        let bkt = { bucket_name: document.getElementById('bucket-name-setup').value };
        let formData = new FormData();
        formData.append("bkt", JSON.stringify(bkt));

        $.ajax({
            url: '/COSBucket',
            type: 'POST',
            data: formData,
            cache: false,
            contentType: false,
            processData: false,
            success: function(myData) {
                if (myData.flag == 0)
                    location.reload();
            },
            error: function() {
                error2.style.display = "block";
            }
        });
    }, 1000);
}

async function uploadSttL() {
    refresh3.style.display = "block";
    refreshMsg.innerHTML = "";
    refreshMsg.innerHTML = "uploading corpus file to watson speech-to-text ...";
    await fetch('/uploadToSttl').then(async(response) => {
        data1 = await response.json();

        if (data1.flag == 1) {
            refreshMsg.innerHTML = "getting corpus file details ...";
            getCorpusDetails();
            uploadSttA();
        }

    });
}

async function uploadSttA() {
    refresh3.style.display = "block";
    refreshMsg.innerHTML = "";
    refreshMsg.innerHTML = "getting file(s) from COS ...";
    await fetch('/uploadToStta').then(async(response) => {
        data2 = await response.json();

        if (data2.flag == 1) {
            refreshMsg.innerHTML = "getting audio files details ...";
            uploadSTT();
        }

        if (data2.flag == 0) {
            sttNotify.innerHTML = '';
            sttNotify.innerHTML = data2.Exception;
            toast2.style.display = "block";
        }
    });
}

async function uploadSTT() {
    refresh3.style.display = "block";
    refreshMsg.innerHTML = "";
    refreshMsg.innerHTML = "uploading file(s) to watson speech-to-text ...";
    await fetch('/uploadSTT').then(async(response) => {
        data5 = await response.json();

        if (data5.flag == 1) {
            refreshMsg.innerHTML = "getting audio file(s) details ...";
            getAudioDetails();
        }

        if (data5.flag == 0) {
            sttNotify.innerHTML = '';
            sttNotify.innerHTML = data5.Exception;
            toast2.style.display = "block";
        }
    });
}

async function getCorpusDetails() {
    refresh3.style.display = "block";
    corpusTableRef.innerHTML = "";
    refreshMsg.innerHTML = " ";
    refreshMsg.innerHTML = "getting corpus file details ...";
    await fetch('/getCorpusDetails').then(async(response) => {
        data3 = await response.json();
        corpusDetails.style.display = "block";
        element = data3.corpora[0];
        if (element != undefined) {
            var newRow = corpusTableRef.insertRow();

            // Insert a cell in the row at index 0
            var newCell = newRow.insertCell(0);
            var newCell2 = newRow.insertCell(1);
            var newCell3 = newRow.insertCell(2);
            var newCell4 = newRow.insertCell(3);
            var newCell5 = newRow.insertCell(4);

            // Append a text node to the cell
            var newText = document.createTextNode(element.name);
            var newText2 = document.createTextNode(element.out_of_vocabulary_words);
            var newText3 = document.createTextNode(element.total_words);
            var newText4 = document.createTextNode(element.status);
            var newText5 = document.createTextNode(element.status);

            newCell.appendChild(newText);
            newCell2.appendChild(newText2);
            newCell3.appendChild(newText3);
            newCell4.appendChild(newText4);
            newCell5.appendChild(newText5);

            newCell5.innerHTML = "";
            newCell5.innerHTML = `<button class="bx--btn bx--btn--ghost bx--btn--sm" onclick='deleteSttCorpusFiles("${element.name}")' type="button"> \
                            <svg focusable="false" preserveAspectRatio="xMidYMid meet" style="will-change: transform;" \
                                xmlns="http://www.w3.org/2000/svg" class="bx--btn__icon" width="16" height="16" \
                                viewBox="0 0 32 32" aria-hidden="true"> \
                                <path d="M25.7,9.3l-7-7A.91.91,0,0,0,18,2H8A2,2,0,0,0,6,4V28a2,2,0,0,0,2,2H24a2,2,0,0,0,2-2V10A.91.91,0,0,0,25.7,9.3ZM18,4.4,23.6,10H18ZM24,28H8V4h8v6a2,2,0,0,0,2,2h6Z">\
                                </path><path d="M11 19H21V21H11z"></path> </svg> </button>`;

            var x = corpusTable.rows.length;
            if (x > 1) {
                corpusDetails.style.display = "block";
                corpusDetails.innerHTML = "Corpus File Details";
                corpusTable.style.display = "block";
            } else {
                refresh3.style.display = "none";
                corpusDetails.innerHTML = "no corpus file uploaded.";
                corpusTable.style.display = "none";
            }
        } else {
            corpusTable.style.display = "none";
            corpusDetails.innerHTML = "no corpus file uploaded.";
        }


    });

}

async function trainAcousticModel() {

    remove2.style.display = "none";
    await fetch(`/trainAcousticModel`).then(async(response) => {
        data = await response.json();

        if (data.flag == 1) {
            training2.style.display = "block";
            trainingMsg2.innerHTML = "initializing ...";
            checkStatusA();
        } else {
            sttNotify.innerHTML = " ";
            sttNotify.innerHTML = data.Exception;
            toast2.style.display = "block";
        }

        if (data.Exception) {
            sttNotify.innerHTML = " ";
            sttNotify.innerHTML = data.Exception;
            toast2.style.display = "block";
            checkStatusL();
        }
    });
}
async function trainLanguageModel() {
    {
        remove1.style.display = "none";
        await fetch(`/trainLanguageModel`).then(async(response) => {
            data = await response.json();

            if (data.flag == 1) {
                training1.style.display = "block";
                trainingMsg1.innerHTML = "initializing ...";
                checkStatusL();
            } else {
                sttNotify.innerHTML = " ";
                sttNotify.innerHTML = data.Exception;
                toast2.style.display = "block";
            }

            if (data.Exception) {
                sttNotify.innerHTML = " ";
                sttNotify.innerHTML = data.Exception;
                toast2.style.display = "block";
                checkStatusL();
            }
        });
    }
}

async function checkStatusL() {
    remove1.innerHTML = "";
    await fetch(`/checkStatusL`).then(async(response) => {
        data = await response.json();
        refresh4.style.display = "none";
        if (data.status == 'available') {

            training1.style.display = "none";
            remove1.innerHTML = " ";
            remove1.innerHTML = data.status;

        } else if (data.status == 'ready') {

            training1.style.display = "none";
            remove1.innerHTML = data.status;


        } else if (data.status == 'pending') {

            training1.style.display = "none";
            remove1.innerHTML = data.status;


        } else {

            training1.style.display = "block";
            trainingMsg1.innerHTML = data.status;
            remove1.innerHTML = "";
            setTimeout(checkStatusL, 5000);
        }

    });
}
async function checkStatusA() {
    remove2.innerHTML = "";
    await fetch(`/checkStatusA`).then(async(response) => {
        data = await response.json();
        refresh4.style.display = "none";
        if (data.status == 'available') {

            training2.style.display = "none";
            remove2.innerHTML = data.status;

        } else if (data.status == 'ready') {

            training2.style.display = "none";
            remove2.innerHTML = data.status;


        } else if (data.status == 'pending') {

            training2.style.display = "none";
            remove2.innerHTML = data.status;


        } else {

            training2.style.display = "block";
            trainingMsg2.innerHTML = data.status;
            remove2.innerHTML = "";
            setTimeout(checkStatusA, 5000);
        }

    });
}

async function refresh() {
    getCorpusDetails();
    getAudioDetails();
}

async function refreshModels() {
    refresh4.style.display = "block";
    checkStatusL();
    checkStatusA();
}

async function getAudioDetails() {
    refreshMsg.innerHTML = " ";
    refreshMsg.innerHTML = "getting audio files details ...";
    await fetch('/getAudioDetails').then(async(response) => {
        data4 = await response.json();
        audiosTableRef.innerHTML = "";
        audioDetails.style.display = "block";
        data4.audio.forEach(element => {
            var newRow = audiosTableRef.insertRow();

            // Insert a cell in the row at index 0
            var newCell = newRow.insertCell(0);
            var newCell2 = newRow.insertCell(1);
            var newCell3 = newRow.insertCell(2);
            var newCell4 = newRow.insertCell(3);

            // Append a text node to the cell
            var newText = document.createTextNode(element.name);
            var newText2 = document.createTextNode(element.duration + " sec");
            var newText3 = document.createTextNode(element.status);
            var newText4 = document.createTextNode(element.status);

            newCell.appendChild(newText);
            newCell2.appendChild(newText2);
            newCell3.appendChild(newText3);
            newCell4.appendChild(newText4);
            newCell4.innerHTML = "";
            newCell4.innerHTML = `<button class="bx--btn bx--btn--ghost bx--btn--sm" onclick='deleteSttAudioFiles("${ element.name }")' type="button"> \
                            <svg focusable="false" preserveAspectRatio="xMidYMid meet" style="will-change: transform;" \
                                xmlns="http://www.w3.org/2000/svg" class="bx--btn__icon" width="16" height="16" \
                                viewBox="0 0 32 32" aria-hidden="true"> \
                                <path d="M25.7,9.3l-7-7A.91.91,0,0,0,18,2H8A2,2,0,0,0,6,4V28a2,2,0,0,0,2,2H24a2,2,0,0,0,2-2V10A.91.91,0,0,0,25.7,9.3ZM18,4.4,23.6,10H18ZM24,28H8V4h8v6a2,2,0,0,0,2,2h6Z">\
                                </path><path d="M11 19H21V21H11z"></path> </svg> </button>`;
            refresh3.style.display = "none";
        });
        var x = audiosTable.rows.length;
        if (x > 1) {
            audioDetails.style.display = "block";
            audioDetails.innerHTML = "Audio Files Details"
            audiosTable.style.display = "block";
        } else {
            refresh3.style.display = "none";
            audioDetails.innerHTML = "no audio files uploaded.";
            audiosTable.style.display = "none";
        }
    });
    clickBtn4.click();
}

async function deleteSttAudioFiles(fileName) {
    await fetch(`/deleteSttAudioFiles?fileName=${fileName}`).then(async(response) => {
        data = await response.json();

        if (data.flag == 1) {
            clickBtn3.click();

        } else {
            sttNotify.innerHTML = " ";
            sttNotify.innerHTML = data.Exception;
            toast2.style.display = "block";
        }
    });
}

async function deleteSttCorpusFiles(fileName) {
    await fetch(`/deleteSttCorpusFiles?fileName=${fileName}`).then(async(response) => {
        data = await response.json();

        if (data.flag == 1) {
            clickBtn3.click();

        } else {
            sttNotify.innerHTML = " ";
            sttNotify.innerHTML = data.Exception;
            toast2.style.display = "block";
        }
    });
}

async function getConvertedFiles() {
    tableRef.innerHTML = " ";
    refresh2.style.display = "block";
    await fetch('/getAudioFiles').then(async(response) => {
        audio.style.display = "block";
        data = await response.json();
        data.forEach(element => {
            audioPlayer = '<br/><a><audio controls> <source src="static/' +
                element.audioFile + '" type="audio/flac"> Your browser does not support the audio element. </audio></a>';
            // Insert a row in the table at the last row
            var newRow = tableRef.insertRow();

            // Insert a cell in the row at index 0
            var newCell = newRow.insertCell(0);
            var newCell2 = newRow.insertCell(1);
            var newCell3 = newRow.insertCell(2);
            var newCell4 = newRow.insertCell(3);

            fileFormat = element.audioFile.split('.')[1];

            // Append a text node to the cell
            var newText = document.createTextNode(element.audioFile.split('/')[1]);
            var newText2 = document.createTextNode(element.fileSize);
            var newText3 = document.createTextNode(fileFormat);
            var newText4 = document.createTextNode(fileFormat);

            newCell.appendChild(newText);
            newCell2.appendChild(newText2);
            newCell3.appendChild(newText3);
            newCell4.appendChild(newText4);

            newCell4.innerHTML = "";
            newCell4.innerHTML = `<button class="bx--btn bx--btn--ghost bx--btn--sm" onclick='deleteUploadedFile("${ element.audioFile }")' type="button"> \
                            <svg focusable="false" preserveAspectRatio="xMidYMid meet" style="will-change: transform;" \
                                xmlns="http://www.w3.org/2000/svg" class="bx--btn__icon" width="16" height="16" \
                                viewBox="0 0 32 32" aria-hidden="true"> \
                                <path d="M25.7,9.3l-7-7A.91.91,0,0,0,18,2H8A2,2,0,0,0,6,4V28a2,2,0,0,0,2,2H24a2,2,0,0,0,2-2V10A.91.91,0,0,0,25.7,9.3ZM18,4.4,23.6,10H18ZM24,28H8V4h8v6a2,2,0,0,0,2,2h6Z">\
                                </path><path d="M11 19H21V21H11z"></path> </svg> </button>`;


        });
        table.style.display = "block";
        refresh2.style.display = "none";
    });
    var x = document.getElementById("table").rows.length;
    if (x > 1)
        table.style.display = "block";
    else
        table.style.display = "none";
}

async function deleteUploadedFile(fileName, fileType) {
    console.log(fileName, fileType);

    await fetch(`/deleteUploadedFile?fileName=${fileName}`).then(async(response) => {
        data = await response.json();
        if (data.flag == 0) {
            clickBtn2.click();

        } else if (data.flag == 1) {
            cosNotify.innerHTML = " ";
            cosNotify.innerHTML = "Something went wrong";
            toast.style.display = "block";
        }
    });
}