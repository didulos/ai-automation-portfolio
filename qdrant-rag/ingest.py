from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer

# 1. Qdrant 클라이언트 초기화 (로컬 호스트 연결)
client = QdrantClient(host="localhost", port=6333)

# 2. 임베딩 모델 로드 (멀티링구얼 지원 모델 추천)
# Xeon CPU 환경에서 효율적으로 돌아가는 가벼운 모델입니다.
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2', device='cpu')

COLLECTION_NAME = "my_knowledge_base"

# 3. 컬렉션 생성 (이미 있으면 생략)
if not client.collection_exists(collection_name=COLLECTION_NAME):
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(
            size=384,  # 모델의 출력 벡터 차원 (MiniLM-L12-v2는 384)
            distance=models.Distance.COSINE
        ),
    )
    print(f"Collection '{COLLECTION_NAME}' created.")

# 4. 첫 문서 데이터 준비 (아름드리의 메모나 문서 내용)
documents = [
    {"id": 1, "text": "AI 에이전트 비즈니스를 위한 RAG 시스템 구축 가이드", "category": "AI"},
    {"id": 2, "text": "Sogang University Business Administration knowledge base", "category": "Career"}
]

# 5. 임베딩 및 데이터 업서트(Upsert)
points = []
for doc in documents:
    # 텍스트를 벡터로 변환
    vector = model.encode(doc["text"]).tolist()
    
    # Qdrant에 넣을 포인트 생성
    points.append(
        models.PointStruct(
            id=doc["id"],
            vector=vector,
            payload={"text": doc["text"], "category": doc["category"]}
        )
    )

client.upsert(collection_name=COLLECTION_NAME, points=points)
print("성공적으로 첫 문서를 임베딩하여 Qdrant에 저장했습니다.")
