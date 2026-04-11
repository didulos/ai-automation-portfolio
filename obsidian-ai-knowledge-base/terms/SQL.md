SQL

# SQL

## 정의

SQL (Structured Query Language)은 관계형 데이터베이스(relational database)에서 데이터를 조회, 삽입, 수정, 삭제하기 위한 표준화된 질의 언어이다. SELECT, INSERT, UPDATE, DELETE 등의 명령어를 통해 구조화된 데이터에 접근하고 조작한다.

## 왜 중요한가

데이터 분석, 머신러닝 모델 학습, 실무 자동화 등 거의 모든 데이터 기반 작업에서 필수적으로 사용되는 기술이다. 효율적인 데이터 추출과 전처리(data preprocessing) 능력은 AI/ML 엔지니어의 핵심 역량이다.

## 관련 개념

- **상위 개념**: [[Database]](데이터베이스)
- **하위 개념**: 
  - [[Query]](쿼리) - SQL 명령문 자체
  - [[JOIN]](조인) - 여러 테이블의 데이터를 결합하는 연산
- **연관 개념**: 
  - [[ETL]](추출-변환-로드) - 데이터 파이프라인에서 SQL과 함께 사용
  - [[Data-Warehouse]](데이터 웨어하우스) - SQL의 주요 활용 환경

## 비유로 이해하기

도서관에서 책을 찾는 과정이라고 생각해보자. SQL은 도서관 사서에게 "2023년 이후 AI 관련 책 중 500쪽 이상인 것들을 제목순으로 보여달라"는 구체적인 요청을 하는 것과 같다. 정확한 기준을 제시하면 필요한 데이터를 빠르게 얻을 수 있다.

## 실제 사용 예시

```sql
SELECT user_id, COUNT(*) as purchase_count 
FROM orders 
WHERE purchase_date >= '2024-01-01' 
GROUP BY user_id;
```

머신러닝 모델 학습을 위해 2024년 이후 구매 기록을 집계하여 사용자별 구매 빈도 데이터셋을 만드는 예시이다.