Word-Embeddings

# Word-Embeddings

## 정의

단어(word)를 연속적인 수치 벡터(numerical vector)로 변환하여 [[Vector-Space]](벡터 공간)에 표현하는 기법이다. 단어의 의미와 문맥적 관계를 수치적으로 인코딩하여 기계가 이해할 수 있도록 만든다.

## 왜 중요한가

[[AI-Terms/01-Terms/NLP]](자연어처리)에서 단어를 정량적으로 처리할 수 있게 하며, 단어 간 의미적 유사성 계산과 [[AI-Terms/01-Terms/Deep-Learning]](심층학습) 모델의 입력으로 사용되어 성능을 크게 향상시킨다.

## 관련 개념

**상위 개념:**
- [[Representation-Learning]](표현 학습)

**하위 개념:**
- [[Word2Vec]](Word2Vec) - 얕은 신경망 기반의 임베딩 학습 방식
- [[GloVe]](GloVe) - 단어 공기(co-occurrence) 통계를 활용한 임베딩 기법

**연관 개념:**
- [[Tokenization]](토큰화) - 임베딩 전 필수 전처리 단계
- [[Cosine-Similarity]](코사인 유사도) - 임베딩된 단어 간 유사성 측정

## 비유로 이해하기

사람의 얼굴을 수백 개의 좌표로 표현하는 것처럼, 단어도 고차원 벡터(multi-dimensional vector)의 좌표로 표현한다. 의미가 비슷한 단어들은 [[Vector-Space]](벡터 공간)에서도 가까이 위치하게 된다.

## 실제 사용 예시

"king - man + woman ≈ queen" 처럼 벡터 연산으로 단어의 의미적 관계를 계산할 수 있으며, [[Sentiment-Analysis]](감정 분석)나 [[Text-Classification]](텍스트 분류) 모델의 입력층으로 광범위하게 활용된다.