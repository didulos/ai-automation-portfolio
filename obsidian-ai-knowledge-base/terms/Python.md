Python

# Python

## 정의
[[Python]]은 간단하고 읽기 쉬운 문법을 가진 고수준 프로그래밍 언어로, 인공지능(AI) 및 머신러닝(ML) 분야에서 가장 널리 사용된다. 동적 타입 시스템(dynamic typing)을 지원하며 다양한 라이브러리 생태계를 갖추고 있어 데이터 분석, 모델 개발, 자동화 등에 최적화되어 있다.

## 왜 중요한가
AI/ML 실무에서 [[NumPy]], [[Pandas]], [[Scikit-learn]], [[TensorFlow]], [[PyTorch]] 등 핵심 라이브러리들이 모두 Python 기반으로 제공되므로, Python 능숙도는 데이터 과학자와 ML 엔지니어의 필수 역량이다. 또한 빠른 프로토타이핑(prototyping)과 실험을 가능하게 하여 개발 생산성을 크게 향상시킨다.

## 관련 개념
- **상위 개념**: [[Programming-Language]](프로그래밍 언어)
- **하위 개념**: 
  - [[NumPy]](숫자 연산 라이브러리)
  - [[Pandas]](데이터 분석 라이브러리)
- **연관 개념**: 
  - [[Jupyter-Notebook]](주피터 노트북)
  - [[Virtual-Environment]](가상 환경)
  - [[Git]](버전 관리 시스템)

## 비유로 이해하기
[[Python]]은 마치 '레고 블록'처럼, 누구나 쉽게 조립할 수 있는 기본 블록(문법)과 다양한 분야의 전문 블록 세트([[NumPy]], [[Matplotlib]] 등)를 제공하여 누구나 빠르게 원하는 것을 만들 수 있는 언어이다.

## 실제 사용 예시
```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

# 데이터 로드 및 전처리
df = pd.read_csv('data.csv')
X = df.drop('target', axis=1)
y = df['target']

# 모델 학습
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
model = RandomForestClassifier().fit(X_train, y_train)
```