import boto3
from json import dumps

class ConnectionS3:
    def __init__(self) -> None:
        self.__s3 = boto3.client('s3', aws_access_key_id= "GLZG2JTWDFFSCQVE7TSQ", aws_secret_access_key="VjTXOpbhGvYjDJDAt2PNgbxPKjYA4p4B7Btmm4Tw", endpoint_url="http://192.168.180.9:8000/")

    def upload(self, key: str, body: dict, bucket: str = 'ai-pipeline-statistics') -> None:
        self.__s3.put_object(Bucket=bucket, Key=key, Body=dumps(body, indent=2, ensure_ascii=False))

if(__name__ == '__main__'):
    conn: ConnectionS3 = ConnectionS3()
    conn.upload('test/initesting.json', {"apakah_berhasil": True})