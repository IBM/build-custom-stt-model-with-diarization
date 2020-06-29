'''Import Libraries'''

from flask import Flask, render_template, request, redirect, url_for, jsonify
import requests
from werkzeug import secure_filename
import ibm_boto3
from ibm_botocore.client import Config, ClientError
from ibm_watson import SpeechToTextV1
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from ibm_watson.websocket import RecognizeCallback, AudioSource
import os
import json
import math


''' Initialize Flask Variables '''

app = Flask(__name__)

app.config["CORPUS_UPLOAD"] = "static/raw/"
app.config["AUDIO_UPLOAD"] = "static/audios/"
app.config["TRANSCRIPT_UPLOAD"] = "static/transcripts/"
app.config["COS_TRANSCRIPT"] = "transcript/"
app.config["COS_AUDIOS"] = "audios/"


''' Initialize other constants for COS and STT '''


# Constants for IBM COS values
COS_ENDPOINT = ""
COS_API_KEY_ID = ""
COS_AUTH_ENDPOINT = ""
COS_RESOURCE_CRN = ""
COS_BUCKET_LOCATION = "us-standard"
bucket_name = ""

# Constants for Speech-To-Text values
STT_API_KEY_ID = ""
STT_URL = ""
language_customization_id = ""
acoustic_customization_id = ""

transcript = ''
filename_converted = ''

''' Methods for IBM Watson Speech-To-Text '''

with open('speechtotext.json', 'r') as credentialsFile:
    credentials1 = json.loads(credentialsFile.read())

STT_API_KEY_ID = credentials1.get('apikey')
STT_URL = credentials1.get('url')
STT_language_model = "Earnings call language model"
STT_acoustic_model = "Earnings call acoustic model"

authenticator = IAMAuthenticator(STT_API_KEY_ID)
speech_to_text = SpeechToTextV1(
    authenticator=authenticator
)
speech_to_text.set_service_url(STT_URL)

language_models = speech_to_text.list_language_models().get_result()
model = language_models["customizations"]
for i in model:
    if i["name"] == STT_language_model:
        language_customization_id = i["customization_id"]

acoustic_models = speech_to_text.list_acoustic_models().get_result()
model = acoustic_models["customizations"]
for i in model:
    if i["name"] == STT_acoustic_model:
        acoustic_customization_id = i["customization_id"]


@app.route('/initSTT')
def initSTT():
    models = []
    flag1 = False
    flag2 = False
    try:
        language_models = speech_to_text.list_language_models().get_result()
        acoustic_models = speech_to_text.list_acoustic_models().get_result()

        language_model = language_models["customizations"]
        acoustic_model = acoustic_models["customizations"]

        for name in language_model:
            if name["name"] == STT_language_model:
                flag1 = True
                break

        for name in acoustic_model:
            if name["name"] == STT_acoustic_model:
                flag2 = True
                break

        if not flag1:
            respo = create_custom_stt_model(STT_language_model, 0)
        else:
            respo = {"message": "Language Model \"" +
                     STT_language_model + "\" found!"}

        if not flag2:
            respo = create_custom_stt_model(STT_acoustic_model, 1)
        else:
            respo = {"message": "Acoustic Model \"" +
                     STT_acoustic_model + "\" found!"}

    except ClientError as be:
        respo = {"message": "CLIENT ERROR: {0}\n".format(be)}
    except Exception as e:
        respo = {"message": " {0}".format(e)}

    return json.dumps(respo, indent=2)


def create_custom_stt_model(model_name, flag):
    if flag:
        try:
            # Custom Acoustic model
            acoustic_model = speech_to_text.create_acoustic_model(
                model_name,
                'en-US_BroadbandModel',
                description='Custom Acoustic Model created by code pattern'
            ).get_result()
            print(json.dumps(acoustic_model, indent=2))
            respo = {"message": "custom acoustic model \"{0}\" created!".format(
                acoustic_model.get('customization_id'))}

            global acoustic_customization_id
            acoustic_customization_id = acoustic_model.get('customization_id')

            return respo

        except ClientError as be:
            respo = {"message": "CLIENT ERROR: {0}\n".format(be)}
            return respo
        except Exception as e:
            respo = {"message": " {0}".format(e)}
            return respo
    else:
        try:
            # Custom Language model
            language_model = speech_to_text.create_language_model(
                model_name,
                'en-US_BroadbandModel',
                description='Custom Language Model created by code pattern'
            ).get_result()
            print(json.dumps(language_model, indent=2))
            respo = {"message": "custom language model \"{0}\" created!".format(
                language_model.get('customization_id'))}

            global language_customization_id
            language_customization_id = language_model.get('customization_id')

            return respo

        except ClientError as be:
            respo = {"message": "CLIENT ERROR: {0}\n".format(be)}
            return respo
        except Exception as e:
            respo = {"message": " {0}".format(e)}
            return respo


''' Methods for IBM Cloud Object Storage '''

with open('credentials.json', 'r') as credentialsFile:
    credentials = json.loads(credentialsFile.read())

# connect to IBM cloud object storage
endpoints = requests.get(credentials.get('endpoints')).json()
iam_host = (endpoints['identity-endpoints']['iam-token'])
cos_host = (endpoints['service-endpoints']
            ['cross-region']['us']['public']['us-geo'])

# Constrict auth and cos endpoint
auth_endpoint = "https://" + iam_host + "/identity/token"
service_endpoint = "https://" + cos_host

# Assign Bucket Name
try:
    bucket_name = credentials.get('bucket_name')
except Exception as e:
    bucket_name = "notassigned"

# Set Constants for IBM COS values
COS_ENDPOINT = service_endpoint
COS_API_KEY_ID = credentials.get('apikey')
COS_AUTH_ENDPOINT = auth_endpoint

COS_RESOURCE_CRN = credentials.get('resource_instance_id')

# Create client
cos = ibm_boto3.resource("s3",
                         ibm_api_key_id=COS_API_KEY_ID,
                         ibm_service_instance_id=COS_RESOURCE_CRN,
                         ibm_auth_endpoint=COS_AUTH_ENDPOINT,
                         config=Config(signature_version="oauth"),
                         endpoint_url=COS_ENDPOINT
                         )


@app.route('/COSBucket',  methods=['GET', 'POST'])
def setupCOSBucket():
    if request.method == 'POST':
        temp = request.form
        bkt = json.loads(temp['bkt'])
        with open('credentials.json', 'r') as credentialsFile:
            cred = json.loads(credentialsFile.read())
        cred.update(bkt)
        print(json.dumps(cred, indent=2))
        with open('credentials.json', 'w') as fp:
            json.dump(cred, fp,  indent=2)
        return jsonify({'flag': 0})


@app.route('/initCOS')
def initializeCOS():
    try:
        global bucket_name
        flag = False
        buckets = cos.buckets.all()
        with open('credentials.json', 'r') as credentialsFile:
            cred = json.loads(credentialsFile.read())
        for bucket in buckets:
            if cred['bucket_name'] == bucket.name:
                flag = True
                bucket_name = cred['bucket_name']
                break
        if not flag:
            respo = {"message": "Bucket \"" +
                     bucket_name + "\" does not exists"}
        else:
            respo = {"message": "Bucket \"" + bucket_name + "\" found!"}

    except ClientError as be:
        respo = {"message": "CLIENT ERROR: {0}\n".format(be)}
    except Exception as e:
        respo = {"message": " {0}".format(e)}
    print(json.dumps(respo, indent=2))
    return jsonify(respo)


def get_bucket_contents(bucket_name):
    myList = []
    print("Retrieving bucket contents from: {0}".format(bucket_name))
    try:
        files = cos.Bucket(bucket_name).objects.all()
        for file in files:
            myList.append([file.key, file.size])
            print("Item: {0} ({1} bytes).".format(file.key, file.size))
        return myList
    except ClientError as be:
        print("CLIENT ERROR: {0}\n".format(be))
    except Exception as e:
        print("Unable to retrieve bucket contents: {0}".format(e))


def get_item(bucket_name, item_name):
    print("Retrieving item from bucket: {0}, key: {1}".format(
        bucket_name, item_name))
    try:
        file = cos.Object(bucket_name, item_name).get()
        return file["Body"].read()
    except ClientError as be:
        print("CLIENT ERROR: {0}\n".format(be))
    except Exception as e:
        print("Unable to retrieve file contents: {0}".format(e))


def delete_item(bucket_name, item_name):
    print("Deleting item: {0}".format(item_name))
    try:
        cos.Object(bucket_name, item_name).delete()
        print("Item: {0} deleted!".format(item_name))
    except ClientError as be:
        print("CLIENT ERROR: {0}\n".format(be))
    except Exception as e:
        print("Unable to delete item: {0}".format(e))


def multi_part_upload(bucket_name, item_name, file_path):
    try:
        print("Starting file transfer for {0} to bucket: {1}\n".format(
            item_name, bucket_name))
        # set 5 MB chunks
        part_size = 1024 * 1024 * 5

        # set threadhold to 15 MB
        file_threshold = 1024 * 1024 * 15

        # set the transfer threshold and chunk size
        transfer_config = ibm_boto3.s3.transfer.TransferConfig(
            multipart_threshold=file_threshold,
            multipart_chunksize=part_size
        )

        # the upload_fileobj method will automatically execute a multi-part upload
        # in 5 MB chunks for all files over 15 MB
        with open(file_path, "rb") as file_data:
            cos.Object(bucket_name, item_name).upload_fileobj(
                Fileobj=file_data,
                Config=transfer_config
            )

        print("Transfer for {0} Complete!\n".format(item_name))
        return "Transfer for {0} Complete!\n".format(item_name)
    except ClientError as be:
        print("CLIENT ERROR: {0}\n".format(be))
        return "CLIENT ERROR: {0}\n".format(be)
    except Exception as e:
        print("Unable to complete multi-part upload: {0}".format(e))
        return "Unable to complete multi-part upload: {0}".format(e)


''' Method to handle POST upload '''


@app.route('/uploader', methods=['GET', 'POST'])
def uploader():
    try:
        if request.method == 'POST':
            f = request.files["video"]
            filename_converted = f.filename.replace(
                " ", "-").replace("'", "").lower()
            cmd = 'rm -r static/raw/*'
            os.system(cmd)
            f.save(os.path.join(
                app.config["CORPUS_UPLOAD"], secure_filename("corpus-file.txt")))

        myResponse = {"message": 1}
    except Exception as e:
        print("Unable {0}".format(e))
        myResponse = {"message": str(e)}

    return jsonify(myResponse)


@app.route('/uploadToSttl')
def uploadToSttl():

    try:
        with open('static/raw/corpus-file.txt', 'rb') as corpus_file:
            speech_to_text.add_corpus(
                language_customization_id,
                'corpus-file.txt',
                corpus_file,
                allow_overwrite=True
            )

        return jsonify({"flag": 1})

    except Exception as e:
        print("Exception Occured -> {0}".format(e))
        return jsonify({"flag": 0, "Exception": "{0}".format(e)})


def scanAvailableAudioFiles():
    availableFiles = os.listdir(app.config["AUDIO_UPLOAD"])
    return availableFiles


@app.route('/uploadToStta')
def uploadToStta():
    try:
        audios_COS = []
        for file in get_bucket_contents(bucket_name):
            if file[0][0] == 'a':
                audios_COS.append(file[0])

        for audios in audios_COS:
            if audios.split('/')[1] in scanAvailableAudioFiles():
                print('Skipping ... ' + audios.split('/')[1])
            else:
                with open(app.config["AUDIO_UPLOAD"] + audios.split('/')[1], 'wb') as write_bytes:
                    write_bytes.write(get_item(bucket_name, audios))

        return jsonify({"flag": 1})

    except Exception as e:
        print("Exception Occured -> {0}".format(e))
        return jsonify({"flag": 0, "Exception": "{0}".format(e)})


@app.route('/uploadSTT')
def uploadSTT():
    try:
        for audiosToUpload in scanAvailableAudioFiles():
            if audiosToUpload == ".DS_Store":
                continue
            with open(app.config["AUDIO_UPLOAD"] + audiosToUpload, 'rb') as audio_file:
                print('Uploading ' + audiosToUpload + ' to Speech-to-text ...')
                speech_to_text.add_audio(
                    acoustic_customization_id,
                    audiosToUpload,
                    audio_file,
                    allow_overwrite=True,
                    content_type='audio/flac'
                )
                print('Done uploading')

        return jsonify({"flag": 1})
    except Exception as e:
        print("Exception Occured -> {0}".format(e))
        return jsonify({"flag": 0, "Exception": "{0}".format(e)})


''' Method to delete files from Cloud Object Storage '''


def deleteFiles(fileName):
    try:
        fileNameLocal = fileName.split('/')[1]

        fileToDelete = 'rm static/audios/' + fileNameLocal

        os.system(fileToDelete)
        item_name = fileName

        delete_item(bucket_name, item_name)

        myFlag = {"flag": 0}
    except OSError as err:
        myFlag = {"flag": 1}

    return jsonify(myFlag)


@app.route('/deleteSttAudioFiles')
def deleteSttFiles():
    fileName = request.args['fileName']

    try:
        speech_to_text.delete_audio(
            acoustic_customization_id,
            fileName
        )

        return jsonify({"flag": 1})

    except Exception as e:
        print("Exception Occured -> {0}".format(e))
        return jsonify({"flag": 0, "Exception": "{0}".format(e)})


@app.route('/deleteSttCorpusFiles')
def deleteSttCorpusFiles():
    fileName = request.args['fileName']
    try:
        speech_to_text.delete_corpus(
            language_customization_id,
            fileName
        )

        return jsonify({"flag": 1})

    except Exception as e:
        print("Exception Occured -> {0}".format(e))
        return jsonify({"flag": 0, "Exception": "{0}".format(e)})


''' Methods to transcribe text '''


class MyRecognizeCallback(RecognizeCallback):
    def __init__(self):
        RecognizeCallback.__init__(self)

    def on_data(self, data):
        print(json.dumps(data, indent=2))

    def on_error(self, error):
        print('Error received: {0}'.format(error))

    def on_inactivity_timeout(self, error):
        print('Inactivity timeout: {0}'.format(error))


myRecognizeCallback = MyRecognizeCallback()


@app.route('/transcribeAudio', methods=['GET', 'POST'])
def transcribeAudio():

    if request.method == 'POST':
        # response = request.form
        f = request.files['audio']
        model = request.form

        modelInfo = json.loads(model['model'])

        global filename_converted
        filename_converted = ''
        filename_converted = f.filename.replace(
            " ", "-").replace("'", "").lower()
        cmd = 'rm -r static/audios/*'
        os.system(cmd)
        f.save(os.path.join(
            app.config["AUDIO_UPLOAD"], secure_filename(filename_converted)))

        try:
            print("Processing ...\n")
            with open(app.config["AUDIO_UPLOAD"]+filename_converted, 'rb') as audio_file:
                speech_recognition_results = speech_to_text.recognize(
                    audio=audio_file,
                    content_type='audio/flac',
                    recognize_callback=myRecognizeCallback,
                    model='en-US_BroadbandModel',
                    keywords=['redhat', 'data and AI', 'Linux', 'Kubernetes'],
                    keywords_threshold=0.5,
                    customization_id=modelInfo["langModel"],
                    acoustic_customization_id=modelInfo["acoModel"],
                    timestamps=True,
                    speaker_labels=True,
                    word_alternatives_threshold=0.9
                ).get_result()

                global transcript
                transcript = ''
                for chunks in speech_recognition_results['results']:
                    if 'alternatives' in chunks.keys():
                        alternatives = chunks['alternatives'][0]
                        if 'transcript' in alternatives:
                            transcript = transcript + \
                                alternatives['transcript']
                            transcript += '\n'
                print(transcript)

                with open(app.config["TRANSCRIPT_UPLOAD"]+filename_converted.split('.')[0]+'.txt', "w") as text_file:
                    text_file.write(transcript)

                speakerLabels = speech_recognition_results["speaker_labels"]
                print("Done Processing ...\n")
                extractedData = []
                for i in speech_recognition_results["results"]:
                    if i["word_alternatives"]:
                        mydict = {'from': i["word_alternatives"][0]["start_time"], 'transcript': i["alternatives"]
                                  [0]["transcript"].replace("%HESITATION", ""), 'to': i["word_alternatives"][0]["end_time"]}
                        extractedData.append(mydict)

                finalOutput = []
                finalOutput.append({"filename": filename_converted})
                for i in extractedData:
                    for j in speakerLabels:
                        if i["from"] == j["from"] and i["to"] == j["to"]:
                            mydictTemp = {"from": i["from"],
                                          "to": i["to"],
                                          "transcript": i["transcript"],
                                          "speaker": j["speaker"],
                                          "confidence": j["confidence"],
                                          "final": j["final"],
                                          }
                            finalOutput.append(mydictTemp)
                print("Done Extracting speakers ...\n")
                return json.dumps(finalOutput)

        except Exception as e:
            return jsonify({"Exception": "Exception Occured: {0}".format(e)})


@app.route('/getCorpusDetails')
def getCorpusDetails():
    corpora = speech_to_text.list_corpora(
        language_customization_id).get_result()
    return jsonify(corpora)


@app.route('/saveTextToCOS')
def saveText():
    x = multi_part_upload(
        bucket_name, app.config["COS_TRANSCRIPT"] +
        filename_converted.split('.')[0]+'.txt',
        app.config["TRANSCRIPT_UPLOAD"]+filename_converted.split('.')[0]+'.txt')

    return jsonify({"msg": x})


@app.route('/getAudioDetails')
def getAudioDetails():
    audio_resources = speech_to_text.list_audio(
        acoustic_customization_id).get_result()
    return jsonify(audio_resources)


@app.route('/getAudioFiles')
def getAudioFiles():
    jsonList = []
    for file in get_bucket_contents(bucket_name):
        if file[0][0] == 'a':
            myDict = {'audioFile': file[0], 'fileSize': convert_size(file[1])}
            jsonList.append(myDict)
    return jsonify(jsonList)


@app.route('/deleteUploadedFile')
def deleteUploadedFile():
    fileName = request.args['fileName']
    return deleteFiles(fileName)


''' Methods to check status of the models '''


@app.route('/checkStatusL')
def checkStatusL():

    language_models = speech_to_text.list_language_models().get_result()
    models = language_models["customizations"]

    for model in models:
        if model['customization_id'] == language_customization_id:
            return jsonify({"status": model['status']})


@app.route('/checkStatusA')
def checkStatusA():

    acoustic_models = speech_to_text.list_acoustic_models().get_result()
    models = acoustic_models["customizations"]

    for model in models:
        if model['customization_id'] == acoustic_customization_id:
            return jsonify({"status": model['status']})


@app.route('/listAcousticModels')
def listAcousticModels():
    acoustic_models = speech_to_text.list_acoustic_models().get_result()
    return jsonify(acoustic_models)


@app.route('/listLanguageModels')
def listLanguageModels():
    language_models = speech_to_text.list_language_models().get_result()
    return jsonify(language_models)


''' Methods to train the two models '''


@app.route('/trainLanguageModel')
def trainLanguageModel():
    try:
        speech_to_text.train_language_model(language_customization_id)
        return jsonify({"flag": 1})

    except Exception as e:
        print("Exception Occured -> {0}".format(e))
        return jsonify({"flag": 0, "Exception": "{0}".format(e)})


@app.route('/trainAcousticModel')
def trainAcousticModel():

    try:
        speech_to_text.train_acoustic_model(acoustic_customization_id)
        return jsonify({"flag": 1})

    except Exception as e:
        print("Exception Occured -> {0}".format(e))
        return jsonify({"flag": 0, "Exception": "{0}".format(e)})


''' Other Methods '''


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/transcribe')
def transcribe():
    return render_template('transcribe.html')


def convert_size(size_bytes):
    if size_bytes == 0:
        return "0B"
    size_name = ("B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB")
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return "%s %s" % (s, size_name[i])


port = os.getenv('VCAP_APP_PORT', '8080')
if __name__ == "__main__":
    app.secret_key = os.urandom(12)
    app.run(debug=True, host='0.0.0.0', port=port)
