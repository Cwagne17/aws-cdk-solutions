import boto3
import os
from datetime import datetime,timedelta

ssmclient = boto3.client('ssm', os.environ['region'])
ssmrole = os.getenv('iamrole')

delta = timedelta(hours=1)
expiry = datetime.now() + delta

def lambda_handler(event,context):
    suppliedname = (event['queryStringParameters']['name'])

    ssmactivresponse = ssmclient.describe_activations(
        Filters=[
            {
                'FilterKey': 'DefaultInstanceName',
                'FilterValues': [
                    suppliedname,
                ]
            },
        ],
        MaxResults=1,
    )

    if (ssmactivresponse['ResponseMetadata']['HTTPStatusCode']) == 200 and (ssmactivresponse['ActivationList']) != []:
        print ('Activation Exists Already - Removing and Creating a new Activation')
        activid = ssmactivresponse['ActivationList'][0]['ActivationId']
        remresponse = ssmclient.delete_activation(
        ActivationId=activid
        )
        apiresponse = create_activation(suppliedname)
    else:
        print ('Activation Doesnt Exist - Creating a new Activation')
        apiresponse = create_activation(suppliedname)

    return {
        "statusCode": apiresponse['ResponseMetadata']['HTTPStatusCode'],
        "headers": {"Content-Type": "application/json"},
        "body": "{\\"ActivationCode\\": \\""+str(apiresponse['ActivationCode'])+"\\"\\n\\"ActivationId\\": \\""+str(apiresponse['ActivationId'])+"\\"}"
    }

def create_activation(wkspcname):
    return ssmclient.create_activation(
        Description='WorkspaceActivation-'+wkspcname,
        DefaultInstanceName=wkspcname,
        IamRole=ssmrole,
        RegistrationLimit=1,
        ExpirationDate=expiry,
    )