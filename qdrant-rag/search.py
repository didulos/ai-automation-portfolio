import sys
import warnings
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

# 불필요한 경고 메시지 숨기기 (출력 결과를 깔끔하게 유지하기 위함)
warnings.filterwarnings("ignore")

# 커맨드라인에서 검색어 받기
if len(sys.argv) < 2:
    print("사용법: python3 search.py '검색할 내용'")
    sys.exit(1)

query = sys.argv[1]

# 1. Qdrant 연결 및 모델 로드 (저장할 때와 반드시 동일한 모델 사용)
client = QdrantClient(host="localhost", port=6333)
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2', device='cpu')

# 2. 검색어를 벡터로 변환
query_vector = model.encode(query).tolist()

# 3. Qdrant에서 가장 유사도 높은 데이터 검색 (상위 3개)
search_result = client.query_points(
    collection_name="my_knowledge_base",
    query=query_vector,
    limit=3
).points

# 4. 결과를 마크다운 형식으로 표준 출력(stdout)
print(f"## '{query}'에 대한 로컬 RAG 검색 결과\n")
if not search_result:
    print("관련된 데이터를 찾을 수 없습니다.")
else:
    for hit in search_result:
        # hit.score는 1.0에 가까울수록 유사도가 높음을 의미합니다.
        print(f"- **분류**: {hit.payload.get('category')} (유사도 매칭 점수: {hit.score:.4f})")
        print(f"  **내용**: {hit.payload.get('text')}\n")