BERT

# BERT

## 정의

[[BERT]](Bidirectional Encoder Representations from Transformers)는 양방향 [[Transformer]](트랜스포머) 아키텍처를 사용하여 대규모 텍스트 데이터로 사전학습(pre-training)된 [[Language-Model]](언어 모델)이다. 문맥을 양쪽 방향에서 동시에 학습하여 단어의 의미를 더 정확히 이해할 수 있다.

## 왜 중요한가

[[BERT]]는 텍스트 분류, 개체명 인식, 질의응답 등 대부분의 [[AI-Terms/01-Terms/NLP]](자연어 처리) 작업에서 [[Fine-Tuning]](미세조정)만으로 최고 수준의 성능을 달성할 수 있게 했다. [[Transfer-Learning]](전이학습) 기반 접근법의 실용성을 증명해 현재 산업 표준으로 널리 사용되고 있다.

## 관련 개념

- **상위 개념**: [[Transfer-Learning]](전이학습)
- **하위 개념**: 
  - [[Fine-Tuning]](미세조정): 사전학습된 [[BERT]]를 특정 작업에 맞게 조정하는 과정
  - [[Tokenization]](토큰화): 입력 텍스트를 [[BERT]]가 처리할 수 있는 토큰 단위로 분할
- **연관 개념**: 
  - [[GPT]](제너레이티브 사전학습 트랜스포머): 단방향 언어 모델로 [[BERT]]와 대비되는 아키텍처
  - [[Word-Embedding]](단어 임베딩): [[BERT]]가 생성하는 문맥 기반 단어 벡터

## 비유로 이해하기

[[BERT]]는 문장을 양쪽 눈으로 동시에 보는 독자(reader)와 같다. 왼쪽에서 오른쪽으로만 읽는 일반 독자와 달리, [[BERT]]는 앞뒤 문맥을 모두 고려해 각 단어의 정확한 의미를 파악한다.

## 실제 사용 예시

감정 분석(sentiment analysis) 작업에서 사전학습된 [[BERT]]를 불러온 후, 영화 리뷰 데이터로 2~3 에포크 [[Fine-Tuning]]하면 높은 정확도를 얻을 수 있다.