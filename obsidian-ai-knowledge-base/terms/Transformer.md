Transformer

# Transformer

## 정의

[[Transformer]]는 [[Attention]] 메커니즘을 기반으로 순차 데이터를 병렬로 처리하는 신경망 아키텍처이다. 입력 시퀀스의 모든 위치 간 관계를 동시에 학습할 수 있어, [[RNN]](순환신경망)의 순차 처리 한계를 극복했다. 2017년 "Attention is All You Need" 논문에서 처음 제안되었으며 현대 자연언어처리(NLP) 모델의 기초가 되었다.

## 왜 중요한가

[[Transformer]]는 대규모 언어 모델([[LLM]])과 [[BERT]], [[GPT]] 등 최신 AI 모델의 핵심 아키텍처로, 텍스트, 이미지, 음성 등 다양한 모달리티에서 최고 성능을 달성하고 있다. 병렬 처리로 인한 효율성과 확장성이 현대 생성형 AI의 발전을 가능하게 했다.

## 관련 개념

- **상위 개념**: [[Neural-Network]](신경망)
- **하위 개념**: 
  - [[Self-Attention]](자기주의)
  - [[Multi-Head-Attention]](다중 헤드 주의)
- **연관 개념**: 
  - [[Positional-Encoding]](위치 인코딩)
  - [[Tokenization]](토큰화)

## 비유로 이해하기

[[Transformer]]는 회의실에서 모든 참석자가 동시에 서로의 의견을 듣고 상대방의 중요도를 판단하면서 결정을 내리는 것과 같다. 한 명씩 순서대로 말하는 방식([[RNN]])이 아니라, 모두가 동시에 서로의 영향력을 평가하고 조정한다.

## 실제 사용 예시

ChatGPT, Claude 등의 대화형 AI는 모두 [[Transformer]] 기반의 [[LLM]]으로 구축되었다. 기계 번역, 요약, 질의응답 등 NLP 태스크에서 [[Transformer]]는 사실상 표준 아키텍처로 사용된다.